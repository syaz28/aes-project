# backend/matrices.py

"""
SOURCE OF TRUTH: MATRIX DEFINITIONS
Berdasarkan analisis Paper & Screenshot Project.
"""

# 1. [cite_start]K44 Matrix (Best Performer - Paper) [cite: 1]
# Referensi: R0=0x57, R1=0xAB, R2=0xD5, R3=0xEA, R4=0x75, R5=0xBA, R6=0x5D, R7=0xAE
K44_MATRIX = [0x57, 0xAB, 0xD5, 0xEA, 0x75, 0xBA, 0x5D, 0xAE]

# 2. K43 Matrix (Variation A - Paper)
# Analisis: Swap Row 0 dan Row 2 dari K44
K43_MATRIX = [0xD5, 0xAB, 0x57, 0xEA, 0x75, 0xBA, 0x5D, 0xAE]

# 3. K45 Matrix (Variation B - Paper)
# Analisis: Swap Row 4 dan Row 5 dari K44
K45_MATRIX = [0x57, 0xAB, 0xD5, 0xEA, 0xBA, 0x75, 0x5D, 0xAE]

# 4. [cite_start]AES Matrix (Standard Rijndael) [cite: 1]
# PERBAIKAN FATAL: Byte terakhir dikoreksi dari 0x8E menjadi 0xF8
# Referensi Standard FIPS 197: [0xF1, 0xE3, 0xC7, 0x8F, 0x1F, 0x3E, 0x7C, 0xF8]
AES_MATRIX = [0xF1, 0xE3, 0xC7, 0x8F, 0x1F, 0x3E, 0x7C, 0xF8]

# 5. Identity Matrix
# Referensi Screenshot "Variations": Diagonal 1
IDENTITY_MATRIX = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]

# 6. K44 Rotated
# Analisis: Cyclic Shift (R7 pindah ke R0, sisanya turun)
K44_ROTATED_MATRIX = [0xAE, 0x57, 0xAB, 0xD5, 0xEA, 0x75, 0xBA, 0x5D]

# Dictionary untuk API access
MATRICES = {
    "K44": K44_MATRIX,
    "K43": K43_MATRIX,
    "K45": K45_MATRIX,
    "AES_Standard": AES_MATRIX,
    "Identity": IDENTITY_MATRIX,
    "K44_Rotated": K44_ROTATED_MATRIX
}

# Constants dictionary
CONSTANTS = {
    "Standard": 0x63,
    "Zero": 0x00,
    "Custom": 0x63  # Default
}

def get_matrix_by_name(name: str):
    """Helper untuk mengambil matriks berdasarkan nama Tab UI"""
    if name == "K44 Matrix (Best Performer)":
        return K44_MATRIX
    elif name == "K43 Matrix":
        return K43_MATRIX
    elif name == "K45 Matrix":
        return K45_MATRIX
    elif name == "AES Matrix (Rijndael)":
        return AES_MATRIX
    elif name == "Identity Matrix":
        return IDENTITY_MATRIX
    elif name == "K44 Rotated":
        return K44_ROTATED_MATRIX
    else:
        # Default fallback to K44 if unknown
        return K44_MATRIX