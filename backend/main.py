# backend/main.py

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
import secrets
from PIL import Image
import io
import base64
import time

from matrices import MATRICES, CONSTANTS
from sbox_generator import generate_sbox
from crypto_tests import calculate_all_metrics, calculate_image_security_metrics
from aes_engine import aes_encrypt_cbc, generate_inv_sbox, aes_encrypt_image, aes_decrypt_image

app = FastAPI(title="AES S-box Generator API", version="1.0.0")

# CORS Configuration - Allow all origins for Vercel/Render deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class GenerateRequest(BaseModel):
    matrix_name: str
    constant: str = "0x63"
    custom_matrix: Optional[List[int]] = None
    raw_sbox: Optional[List[int]] = None  # Direct S-box input (256 integers) for Excel import

class EncryptRequest(BaseModel):
    plaintext: str
    key: str
    matrix_name: str
    constant: str = "0x63"
    mode: str = "CBC"
    iv: Optional[str] = None
    custom_matrix: Optional[List[int]] = None

class DecryptRequest(BaseModel):
    ciphertext: str  # Now includes IV prefix (first 32 hex chars)
    key: str
    iv: Optional[str] = None  # Optional - extracted from ciphertext if not provided
    matrix_name: str
    constant: str = "0x63"
    mode: str = "CBC"
    custom_matrix: Optional[List[int]] = None

class MatrixListResponse(BaseModel):
    matrices: List[str]
    constants: List[str]

class GenerateResponse(BaseModel):
    sbox: List[int]
    metrics: dict
    matrix_used: List[int]
    constant_used: int

class ComparisonResult(BaseModel):
    scenario: str
    matrix_name: str
    matrix: List[int]
    constant: int
    metrics: Dict[str, float]
    sbox: List[int]  # ADDED: Include raw S-box array for visualization

class AnalysisResponse(BaseModel):
    results: List[ComparisonResult]
    proposed_sbox: List[int]

class EncryptResponse(BaseModel):
    ciphertext: str
    iv: str
    execution_time: float
    mode: str

class DecryptResponse(BaseModel):
    plaintext: str
    execution_time: float
    mode: str

class ImageEncryptResponse(BaseModel):
    encrypted_image: str  # Base64 encoded
    original_histogram: Dict[str, List[int]]  # {"R": [], "G": [], "B": []}
    encrypted_histogram: Dict[str, List[int]]
    security_metrics: dict  # Entropy, NPCR, UACI, Correlation
    execution_time: float
    iv: str
    image_size: Dict[str, int]  # {"width": w, "height": h}
    mode: str

class ImageDecryptResponse(BaseModel):
    decrypted_image: str  # Base64 encoded
    execution_time: float
    image_size: Dict[str, int]
    mode: str

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_histogram(image: Image.Image) -> Dict[str, List[int]]:
    """
    Calculate color histogram for RGB image
    
    Returns:
        Dictionary with R, G, B histogram data (256 bins each)
    """
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Initialize histograms
    histogram = {
        "R": [0] * 256,
        "G": [0] * 256,
        "B": [0] * 256
    }
    
    # Get pixel data
    pixels = list(image.getdata())
    
    # Count color occurrences
    for pixel in pixels:
        r, g, b = pixel
        histogram["R"][r] += 1
        histogram["G"][g] += 1
        histogram["B"][b] += 1
    
    return histogram

def get_matrix(matrix_name: str, custom_matrix: Optional[List[int]] = None) -> List[int]:
    """Get matrix based on name or custom input."""
    if matrix_name == "Custom":
        if custom_matrix is None:
            raise HTTPException(
                status_code=400,
                detail="Custom matrix requested but no custom_matrix provided"
            )
        
        if len(custom_matrix) != 8:
            raise HTTPException(
                status_code=400,
                detail=f"Custom matrix must have exactly 8 values (got {len(custom_matrix)})"
            )
        
        for i, val in enumerate(custom_matrix):
            if not (0 <= val <= 255):
                raise HTTPException(
                    status_code=400,
                    detail=f"Matrix value at index {i} is out of range (got {val}, expected 0-255)"
                )
        
        return custom_matrix
    
    if matrix_name not in MATRICES:
        raise HTTPException(
            status_code=400,
            detail=f"Matrix '{matrix_name}' not found. Available: {list(MATRICES.keys())}"
        )
    
    return MATRICES[matrix_name]

def parse_constant(constant_str: str) -> int:
    """Parse constant from string (hex or decimal)."""
    try:
        if constant_str.startswith("0x") or constant_str.startswith("0X"):
            constant = int(constant_str, 16)
        else:
            constant = int(constant_str)
        
        if not (0 <= constant <= 255):
            raise ValueError("Constant must be in range 0-255")
        
        return constant
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid constant format: {str(e)}")

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
def root():
    return {
        "message": "AES S-box Generator API",
        "version": "1.0.0",
        "endpoints": [
            "/matrices", 
            "/generate", 
            "/analyze", 
            "/encrypt", 
            "/decrypt", 
            "/encrypt-image",
            "/decrypt-image",
            "/health"
        ]
    }

@app.get("/matrices", response_model=MatrixListResponse)
def get_matrices():
    """Return available matrices and constants"""
    return {
        "matrices": list(MATRICES.keys()),
        "constants": list(CONSTANTS.keys())
    }

@app.post("/generate", response_model=GenerateResponse)
def generate_and_analyze(request: GenerateRequest):
    """Generate S-box and calculate cryptographic metrics (Single matrix analysis)"""
    try:
        matrix = get_matrix(request.matrix_name, request.custom_matrix)
        constant = parse_constant(request.constant)
        sbox = generate_sbox(matrix, constant)
        metrics = calculate_all_metrics(sbox)
        
        return {
            "sbox": sbox,
            "metrics": metrics,
            "matrix_used": matrix,
            "constant_used": constant
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/analyze", response_model=AnalysisResponse)
def batch_analysis(request: GenerateRequest):
    """
    SMART BATCH ANALYSIS: Dynamically compare matrices with anti-duplication logic
    
    Logic:
        - Always show K44 and AES Standard as benchmarks
        - Only add "Custom" column if user's selection is NOT one of the benchmarks
        - If raw_sbox is provided (Excel import), use it directly without generating
        - This prevents duplicate columns when user selects K44 or AES
    
    Returns:
        - results: List of 2, 3 or 4 comparison results (dynamic)
        - proposed_sbox: Generated S-box for user's selected matrix
    """
    try:
        # Parse constant
        constant = parse_constant(request.constant)
        
        # ====================================================================
        # CHECK FOR RAW S-BOX INPUT (Excel Import)
        # ====================================================================
        
        excel_sbox = None
        if request.raw_sbox is not None:
            # Validate raw S-box
            if len(request.raw_sbox) != 256:
                raise HTTPException(
                    status_code=400,
                    detail=f"Raw S-box must have exactly 256 values (got {len(request.raw_sbox)})"
                )
            
            # Validate values are in range 0-255
            for i, val in enumerate(request.raw_sbox):
                if not (0 <= val <= 255):
                    raise HTTPException(
                        status_code=400,
                        detail=f"S-box value at index {i} is out of range (got {val}, expected 0-255)"
                    )
            
            # Validate bijective (each value appears exactly once)
            if len(set(request.raw_sbox)) != 256:
                raise HTTPException(
                    status_code=400,
                    detail="S-box must be bijective (each value 0-255 must appear exactly once)"
                )
            
            excel_sbox = request.raw_sbox
        
        # Get proposed matrix (supports Custom) - only needed if no raw_sbox
        proposed_matrix = None
        if excel_sbox is None:
            proposed_matrix = get_matrix(request.matrix_name, request.custom_matrix)
        
        # ====================================================================
        # SMART SCENARIO LOGIC (Anti-Duplication)
        # ====================================================================
        
        # 1. Base Scenarios (Always Present - Benchmarks)
        scenarios = [
            {
                "scenario": "Research (K44)",
                "matrix_name": "K44",
                "matrix": MATRICES["K44"]
            },
            {
                "scenario": "AES S-box",
                "matrix_name": "AES_Standard",
                "matrix": MATRICES["AES_Standard"]
            }
        ]
        
        # 2. Define Benchmark Matrix Names (case-insensitive check)
        benchmark_keys = [
            "K44",
            "AES_Standard",
            "AES Matrix (Rijndael)",
            "Research (K44)",
            "AES S-box",
            "Excel"  # Excel is also treated separately
        ]
        
        # 3. Conditional Logic: Only add "Custom" if user's selection is NOT a benchmark
        is_benchmark = request.matrix_name in benchmark_keys
        
        if not is_benchmark and excel_sbox is None:
            scenarios.append({
                "scenario": "Custom",
                "matrix_name": request.matrix_name,
                "matrix": proposed_matrix
            })
        
        # ====================================================================
        # Generate S-boxes and Calculate Metrics
        # ====================================================================
        
        results = []
        proposed_sbox = None
        
        # Loop through all scenarios and calculate metrics
        for idx, scenario_info in enumerate(scenarios):
            # Generate S-box for this scenario
            sbox = generate_sbox(scenario_info["matrix"], constant)
            
            # Calculate all cryptographic metrics
            metrics = calculate_all_metrics(sbox)
            
            # Store proposed S-box (user's selected matrix)
            if is_benchmark and excel_sbox is None:
                if scenario_info["matrix_name"] == request.matrix_name:
                    proposed_sbox = sbox
            elif excel_sbox is None:
                if scenario_info["scenario"] == "Custom":
                    proposed_sbox = sbox
            
            # Build result object WITH S-BOX DATA
            result = ComparisonResult(
                scenario=scenario_info["scenario"],
                matrix_name=scenario_info["matrix_name"],
                matrix=scenario_info["matrix"],
                constant=constant,
                metrics=metrics,
                sbox=sbox  # CRITICAL: Include S-box array for visualization
            )
            
            results.append(result)
        
        # ====================================================================
        # ADD EXCEL S-BOX SCENARIO (if provided)
        # ====================================================================
        
        if excel_sbox is not None:
            # Calculate metrics for Excel S-box
            excel_metrics = calculate_all_metrics(excel_sbox)
            
            # Add Excel S-box to results
            excel_result = ComparisonResult(
                scenario="Excel S-box",
                matrix_name="Excel",
                matrix=[0] * 8,  # Placeholder - no matrix for direct S-box
                constant=constant,
                metrics=excel_metrics,
                sbox=excel_sbox
            )
            
            results.append(excel_result)
            proposed_sbox = excel_sbox
        
        # Fallback: If proposed_sbox is still None, use first sbox
        if proposed_sbox is None:
            if excel_sbox is not None:
                proposed_sbox = excel_sbox
            elif proposed_matrix is not None:
                proposed_sbox = generate_sbox(proposed_matrix, constant)
            else:
                proposed_sbox = generate_sbox(MATRICES["K44"], constant)
        
        return {
            "results": results,
            "proposed_sbox": proposed_sbox
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch analysis error: {str(e)}")

@app.post("/encrypt", response_model=EncryptResponse)
def encrypt_data(request: EncryptRequest):
    """Encrypt plaintext using custom AES-128 CBC with generated S-box"""
    try:
        matrix = get_matrix(request.matrix_name, request.custom_matrix)
        
        if request.mode.upper() != "CBC":
            raise HTTPException(status_code=400, detail="Only CBC mode is currently supported")
        
        constant = parse_constant(request.constant)
        
        try:
            key_hex = request.key.replace("0x", "").replace("0X", "").replace(" ", "")
            key_bytes = bytes.fromhex(key_hex)
            
            if len(key_bytes) != 16:
                raise ValueError(f"Key must be 16 bytes (got {len(key_bytes)})")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid key format: {str(e)}")
        
        if request.iv:
            try:
                iv_hex = request.iv.replace("0x", "").replace("0X", "").replace(" ", "")
                iv_bytes = bytes.fromhex(iv_hex)
                
                if len(iv_bytes) != 16:
                    raise ValueError(f"IV must be 16 bytes (got {len(iv_bytes)})")
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid IV format: {str(e)}")
        else:
            iv_bytes = secrets.token_bytes(16)
        
        try:
            plaintext_bytes = request.plaintext.encode('utf-8')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot encode plaintext: {str(e)}")
        
        sbox = generate_sbox(matrix, constant)
        
        import time
        start_time = time.time()
        
        ciphertext_bytes = aes_encrypt_cbc(
            plaintext=plaintext_bytes,
            key=key_bytes,
            sbox=sbox,
            iv=iv_bytes
        )
        
        execution_time = time.time() - start_time
        
        # Prepend IV to ciphertext (IV is first 32 hex chars)
        iv_hex = iv_bytes.hex().upper()
        ciphertext_hex = ciphertext_bytes.hex().upper()
        combined_ciphertext = iv_hex + ciphertext_hex
        
        return {
            "ciphertext": combined_ciphertext,  # IV + Ciphertext combined
            "iv": "",  # No longer needed separately
            "execution_time": round(execution_time, 6),
            "mode": "CBC"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encryption error: {str(e)}")

@app.post("/decrypt", response_model=DecryptResponse)
def decrypt_data(request: DecryptRequest):
    """Decrypt ciphertext using custom AES-128 CBC with generated S-box"""
    try:
        matrix = get_matrix(request.matrix_name, request.custom_matrix)
        
        if request.mode.upper() != "CBC":
            raise HTTPException(status_code=400, detail="Only CBC mode is currently supported")
        
        constant = parse_constant(request.constant)
        
        try:
            key_hex = request.key.replace("0x", "").replace("0X", "").replace(" ", "")
            key_bytes = bytes.fromhex(key_hex)
            
            if len(key_bytes) != 16:
                raise ValueError(f"Key must be 16 bytes (got {len(key_bytes)})")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid key format: {str(e)}")
        
        # Parse ciphertext (may contain IV prefix)
        try:
            ciphertext_hex = request.ciphertext.replace("0x", "").replace("0X", "").replace(" ", "")
            
            # Check if IV is provided separately or embedded in ciphertext
            if request.iv and request.iv.strip():
                # IV provided separately (legacy mode)
                iv_hex = request.iv.replace("0x", "").replace("0X", "").replace(" ", "")
                iv_bytes = bytes.fromhex(iv_hex)
                ciphertext_bytes = bytes.fromhex(ciphertext_hex)
            else:
                # IV embedded in ciphertext (first 32 hex chars = 16 bytes)
                if len(ciphertext_hex) < 32:
                    raise ValueError("Ciphertext too short - must include 16-byte IV prefix")
                
                iv_hex = ciphertext_hex[:32]
                actual_ciphertext_hex = ciphertext_hex[32:]
                
                iv_bytes = bytes.fromhex(iv_hex)
                ciphertext_bytes = bytes.fromhex(actual_ciphertext_hex)
            
            if len(iv_bytes) != 16:
                raise ValueError(f"IV must be 16 bytes (got {len(iv_bytes)})")
            
            if len(ciphertext_bytes) % 16 != 0:
                raise ValueError(f"Ciphertext length must be multiple of 16 bytes (got {len(ciphertext_bytes)})")
                
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid ciphertext format: {str(e)}")
        
        sbox = generate_sbox(matrix, constant)
        inv_sbox = generate_inv_sbox(sbox)
        
        import time
        start_time = time.time()
        
        from aes_engine import aes_decrypt_cbc
        
        plaintext_bytes = aes_decrypt_cbc(
            ciphertext=ciphertext_bytes,
            key=key_bytes,
            inv_sbox=inv_sbox,
            iv=iv_bytes
        )
        
        execution_time = time.time() - start_time
        
        try:
            plaintext = plaintext_bytes.decode('utf-8')
        except UnicodeDecodeError:
            plaintext = f"[Binary Data: {plaintext_bytes.hex().upper()}]"
        
        return {
            "plaintext": plaintext,
            "execution_time": round(execution_time, 6),
            "mode": "CBC"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decryption error: {str(e)}")


@app.post("/encrypt-image", response_model=ImageEncryptResponse)
async def encrypt_image(
    image: UploadFile = File(...),
    key: str = Form(default="00112233445566778899AABBCCDDEEFF"),
    matrix_name: str = Form(default="K44"),
    constant: str = Form(default="0x63"),
    custom_sbox_json: Optional[str] = Form(default=None)  # JSON string of 256 integers for Excel S-box
):
    """
    Encrypt image using custom AES-128 CBC with generated S-box
    
    Features:
    - RGB image encryption with embedded metadata
    - IV, width, height are embedded in the encrypted image
    - No need to save IV separately for decryption
    - Histogram analysis (original vs encrypted)
    - Base64 encoded output for web display
    - Optional custom_sbox_json for Excel-imported S-boxes
    """
    try:
        # Validate image file - handle None content_type
        content_type = image.content_type or ''
        if not content_type.startswith('image/'):
            # Also accept common extensions if content_type is missing
            filename = image.filename or ''
            valid_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp')
            if not filename.lower().endswith(valid_extensions):
                raise HTTPException(status_code=400, detail=f"File must be an image (got content_type: {content_type})")
        
        # Read image
        image_data = await image.read()
        original_image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if original_image.mode != 'RGB':
            original_image = original_image.convert('RGB')
        
        # Get image dimensions
        width, height = original_image.size
        
        # Calculate original histogram
        original_histogram = calculate_histogram(original_image)
        
        # Get raw pixel data
        image_bytes = original_image.tobytes()
        
        # Parse key
        try:
            key_hex = key.replace("0x", "").replace("0X", "").replace(" ", "")
            key_bytes = bytes.fromhex(key_hex)
            
            if len(key_bytes) != 16:
                raise ValueError(f"Key must be 16 bytes (got {len(key_bytes)})")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid key format: {str(e)}")
        
        # Generate random IV
        iv_bytes = secrets.token_bytes(16)
        
        # Generate S-box (use custom if provided, otherwise generate from matrix)
        import json
        
        if custom_sbox_json:
            try:
                custom_sbox = json.loads(custom_sbox_json)
                if not isinstance(custom_sbox, list) or len(custom_sbox) != 256:
                    raise ValueError(f"S-box must be array of 256 integers (got {len(custom_sbox) if isinstance(custom_sbox, list) else 'non-array'})")
                
                # Validate values
                for i, val in enumerate(custom_sbox):
                    if not isinstance(val, int) or not (0 <= val <= 255):
                        raise ValueError(f"S-box value at index {i} must be integer 0-255")
                
                sbox = custom_sbox
            except json.JSONDecodeError as e:
                raise HTTPException(status_code=400, detail=f"Invalid custom_sbox_json format: {str(e)}")
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        else:
            # Process encryption parameters
            matrix = get_matrix(matrix_name, None)
            parsed_constant = parse_constant(constant)
            sbox = generate_sbox(matrix, parsed_constant)
        
        # Start timer
        start_time = time.time()
        
        # Encrypt image data
        encrypted_bytes = aes_encrypt_image(image_bytes, key_bytes, sbox, iv_bytes)
        
        execution_time = time.time() - start_time
        
        # =====================================================================
        # EMBED METADATA: Create header with IV + Width + Height
        # Format: [16 bytes IV] + [4 bytes Width] + [4 bytes Height] + [Encrypted Data]
        # =====================================================================
        import struct
        
        # Create metadata header (24 bytes total)
        width_bytes = struct.pack('>I', width)   # 4 bytes, big-endian unsigned int
        height_bytes = struct.pack('>I', height)  # 4 bytes, big-endian unsigned int
        
        # Combine: IV (16) + Width (4) + Height (4) + Encrypted Data
        full_payload = iv_bytes + width_bytes + height_bytes + encrypted_bytes
        
        # Calculate display dimensions for the full payload
        # Need enough pixels to store all bytes (each pixel = 3 bytes for RGB)
        total_bytes_needed = len(full_payload)
        
        # Pad to be divisible by 3 for RGB conversion
        while len(full_payload) % 3 != 0:
            full_payload += b'\x00'
        
        # Calculate display dimensions (keep aspect ratio close to original)
        total_pixels = len(full_payload) // 3
        aspect_ratio = width / height if height > 0 else 1
        
        # Calculate display dimensions
        display_height = max(1, int((total_pixels / aspect_ratio) ** 0.5))
        display_width = max(1, (total_pixels + display_height - 1) // display_height)
        
        # Ensure we have enough pixels
        while display_width * display_height < total_pixels:
            display_height += 1
        
        # Calculate exact byte size needed
        exact_size = display_width * display_height * 3
        
        # Pad payload to exact size
        if len(full_payload) < exact_size:
            full_payload += b'\x00' * (exact_size - len(full_payload))
        
        # Create encrypted image from full payload (includes metadata)
        encrypted_image = Image.frombytes('RGB', (display_width, display_height), full_payload)
        
        # For histogram and security metrics, create a display version with original dimensions
        # Skip the 24-byte header and use encrypted data only
        display_data = encrypted_bytes[:width * height * 3]
        if len(display_data) < width * height * 3:
            display_data += b'\x00' * (width * height * 3 - len(display_data))
        display_image = Image.frombytes('RGB', (width, height), display_data)
        
        # Calculate encrypted histogram (from display version)
        encrypted_histogram = calculate_histogram(display_image)
        
        # Calculate security metrics (both images have same dimensions)
        security_metrics = calculate_image_security_metrics(
            np.array(original_image),
            np.array(display_image)
        )
        
        # Convert encrypted image (with embedded metadata) to base64
        buffered = io.BytesIO()
        encrypted_image.save(buffered, format="PNG")
        encrypted_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return {
            "encrypted_image": encrypted_base64,
            "original_histogram": original_histogram,
            "encrypted_histogram": encrypted_histogram,
            "security_metrics": security_metrics,
            "execution_time": round(execution_time, 6),
            "iv": "",  # No longer needed - embedded in image
            "image_size": {"width": width, "height": height},
            "mode": "CBC"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image encryption error: {str(e)}")


@app.post("/decrypt-image", response_model=ImageDecryptResponse)
async def decrypt_image(
    file: UploadFile = File(...),
    key: str = Form(...),
    matrix_name: str = Form(default="K44"),
    constant: str = Form(default="0x63")
):
    """
    Decrypt image using custom AES-128 CBC with generated S-box
    
    The encrypted image contains embedded metadata:
    - First 16 bytes: IV
    - Bytes 16-20: Original width (big-endian uint32)
    - Bytes 20-24: Original height (big-endian uint32)
    - Remaining bytes: Encrypted pixel data
    
    User only needs to provide: file + key + S-box selection
    """
    try:
        import struct
        
        # Read encrypted image from uploaded file
        encrypted_data = await file.read()
        
        # Validate file is an image
        try:
            encrypted_img = Image.open(io.BytesIO(encrypted_data))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
        
        # Convert to RGB
        if encrypted_img.mode != 'RGB':
            encrypted_img = encrypted_img.convert('RGB')
        
        # Get all pixel data (contains header + encrypted data)
        raw_bytes = encrypted_img.tobytes()
        
        # =====================================================================
        # EXTRACT METADATA from header
        # Format: [16 bytes IV] + [4 bytes Width] + [4 bytes Height] + [Encrypted Data]
        # =====================================================================
        
        if len(raw_bytes) < 24:
            raise HTTPException(status_code=400, detail="Invalid encrypted image: too small to contain metadata header")
        
        # Extract IV (first 16 bytes)
        iv_bytes = raw_bytes[0:16]
        
        # Extract original dimensions (bytes 16-24)
        width_bytes = raw_bytes[16:20]
        height_bytes = raw_bytes[20:24]
        
        original_width = struct.unpack('>I', width_bytes)[0]
        original_height = struct.unpack('>I', height_bytes)[0]
        
        # Validate dimensions
        if original_width <= 0 or original_height <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid dimensions in header: {original_width}x{original_height}")
        
        if original_width > 10000 or original_height > 10000:
            raise HTTPException(status_code=400, detail=f"Dimensions too large: {original_width}x{original_height}")
        
        # Extract encrypted data (after 24-byte header)
        encrypted_bytes_raw = raw_bytes[24:]
        
        # Process decryption parameters
        matrix = get_matrix(matrix_name, None)
        parsed_constant = parse_constant(constant)
        
        # Parse key with enhanced whitespace removal
        try:
            key_hex = key.replace("0x", "").replace("0X", "").replace(" ", "").replace("\n", "").replace("\t", "")
            key_bytes = bytes.fromhex(key_hex)
            
            if len(key_bytes) != 16:
                raise ValueError(f"Key must be 16 bytes (got {len(key_bytes)})")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid key format: {str(e)}")
        
        # Generate S-box and inverse
        try:
            sbox = generate_sbox(matrix, parsed_constant)
            inv_sbox = generate_inv_sbox(sbox)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"S-box generation error: {str(e)}")
        
        # Start timer
        start_time = time.time()
        
        # Calculate expected original size
        original_size = original_width * original_height * 3
        
        # Calculate encrypted block size (original_size with PKCS7 padding)
        encrypted_block_size = ((original_size + 15) // 16) * 16
        
        # Extract only the encrypted bytes we need
        encrypted_bytes = encrypted_bytes_raw[:encrypted_block_size]
        
        if len(encrypted_bytes) < encrypted_block_size:
            raise HTTPException(
                status_code=400,
                detail=f"Encrypted data incomplete: got {len(encrypted_bytes)} bytes, need {encrypted_block_size}"
            )
        
        try:
            decrypted_bytes = aes_decrypt_image(encrypted_bytes, key_bytes, inv_sbox, iv_bytes)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Decryption failed: {str(e)}. Check if the key is correct.")
        
        execution_time = time.time() - start_time
        
        # Trim to exact original size
        if len(decrypted_bytes) >= original_size:
            decrypted_bytes = decrypted_bytes[:original_size]
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Decryption error: got {len(decrypted_bytes)} bytes, expected at least {original_size}"
            )
        
        # Create decrypted image
        try:
            decrypted_image = Image.frombytes('RGB', (original_width, original_height), decrypted_bytes)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Image reconstruction failed: {str(e)}")
        
        # Convert to base64
        try:
            buffered = io.BytesIO()
            decrypted_image.save(buffered, format="PNG")
            decrypted_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Image encoding failed: {str(e)}")
        
        return {
            "decrypted_image": decrypted_base64,
            "execution_time": round(execution_time, 6),
            "image_size": {"width": original_width, "height": original_height},
            "mode": "CBC"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image decryption error: {str(e)}")


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "AES S-box Generator API",
        "version": "1.0.0"
    }