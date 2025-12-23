# backend/aes_engine.py

"""
OPTIMIZED CUSTOM AES-128 ENGINE (ECB/CBC)
Memungkinkan injeksi S-box kustom.
Hanya untuk tujuan demonstrasi riset (Not for production security).

OPTIMIZATIONS:
- Precomputed GF(2^8) multiplication tables for MixColumns
- Using bytearray instead of bytes concatenation
- Optimized loops and reduced function calls
"""

# Rcon (Round Constants) standar AES
RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36]

# ============================================================================
# PRECOMPUTED GALOIS FIELD MULTIPLICATION TABLES
# ============================================================================

def _init_gmul_table(multiplier):
    """Generate multiplication table for a specific multiplier in GF(2^8)"""
    table = [0] * 256
    for i in range(256):
        p = 0
        a = i
        b = multiplier
        for _ in range(8):
            if b & 1:
                p ^= a
            a <<= 1
            if a & 0x100:
                a ^= 0x11b
            b >>= 1
        table[i] = p
    return table

# Precomputed tables for MixColumns (forward)
GMUL_2 = _init_gmul_table(2)
GMUL_3 = _init_gmul_table(3)

# Precomputed tables for InvMixColumns
GMUL_9 = _init_gmul_table(9)
GMUL_11 = _init_gmul_table(11)  # 0x0b
GMUL_13 = _init_gmul_table(13)  # 0x0d
GMUL_14 = _init_gmul_table(14)  # 0x0e

# ============================================================================
# CORE AES OPERATIONS (OPTIMIZED)
# ============================================================================

def sub_bytes(state, sbox):
    """SubBytes transformation using S-box lookup"""
    for r in range(4):
        for c in range(4):
            state[r][c] = sbox[state[r][c]]
    return state

def inv_sub_bytes(state, inv_sbox):
    """Inverse SubBytes transformation"""
    for r in range(4):
        for c in range(4):
            state[r][c] = inv_sbox[state[r][c]]
    return state

def shift_rows(state):
    """ShiftRows transformation"""
    state[1][0], state[1][1], state[1][2], state[1][3] = state[1][1], state[1][2], state[1][3], state[1][0]
    state[2][0], state[2][1], state[2][2], state[2][3] = state[2][2], state[2][3], state[2][0], state[2][1]
    state[3][0], state[3][1], state[3][2], state[3][3] = state[3][3], state[3][0], state[3][1], state[3][2]
    return state

def inv_shift_rows(state):
    """Inverse ShiftRows transformation"""
    state[1][0], state[1][1], state[1][2], state[1][3] = state[1][3], state[1][0], state[1][1], state[1][2]
    state[2][0], state[2][1], state[2][2], state[2][3] = state[2][2], state[2][3], state[2][0], state[2][1]
    state[3][0], state[3][1], state[3][2], state[3][3] = state[3][1], state[3][2], state[3][3], state[3][0]
    return state

def mix_columns(state):
    """MixColumns transformation using precomputed tables"""
    for c in range(4):
        s0, s1, s2, s3 = state[0][c], state[1][c], state[2][c], state[3][c]
        state[0][c] = GMUL_2[s0] ^ GMUL_3[s1] ^ s2 ^ s3
        state[1][c] = s0 ^ GMUL_2[s1] ^ GMUL_3[s2] ^ s3
        state[2][c] = s0 ^ s1 ^ GMUL_2[s2] ^ GMUL_3[s3]
        state[3][c] = GMUL_3[s0] ^ s1 ^ s2 ^ GMUL_2[s3]
    return state

def inv_mix_columns(state):
    """Inverse MixColumns transformation using precomputed tables"""
    for c in range(4):
        s0, s1, s2, s3 = state[0][c], state[1][c], state[2][c], state[3][c]
        state[0][c] = GMUL_14[s0] ^ GMUL_11[s1] ^ GMUL_13[s2] ^ GMUL_9[s3]
        state[1][c] = GMUL_9[s0] ^ GMUL_14[s1] ^ GMUL_11[s2] ^ GMUL_13[s3]
        state[2][c] = GMUL_13[s0] ^ GMUL_9[s1] ^ GMUL_14[s2] ^ GMUL_11[s3]
        state[3][c] = GMUL_11[s0] ^ GMUL_13[s1] ^ GMUL_9[s2] ^ GMUL_14[s3]
    return state

def add_round_key(state, round_key_slice):
    """AddRoundKey transformation"""
    for r in range(4):
        r4 = r * 4
        state[r][0] ^= round_key_slice[r4]
        state[r][1] ^= round_key_slice[r4 + 1]
        state[r][2] ^= round_key_slice[r4 + 2]
        state[r][3] ^= round_key_slice[r4 + 3]
    return state

# ============================================================================
# KEY EXPANSION
# ============================================================================

def key_expansion(key, sbox):
    """
    AES-128 Key Expansion using custom S-box
    Returns 176-byte expanded key as a list
    """
    expanded_key = list(key)
    rcon_iter = 0
    
    while len(expanded_key) < 176:
        # Get last 4 bytes
        temp = expanded_key[-4:]
        
        if len(expanded_key) % 16 == 0:
            # RotWord
            temp = [temp[1], temp[2], temp[3], temp[0]]
            # SubWord using custom S-box
            temp = [sbox[b] for b in temp]
            # XOR Rcon
            temp[0] ^= RCON[rcon_iter]
            rcon_iter += 1
        
        # XOR with word 16 bytes earlier
        start = len(expanded_key) - 16
        for i in range(4):
            expanded_key.append(expanded_key[start + i] ^ temp[i])
    
    return expanded_key

# ============================================================================
# BLOCK ENCRYPTION/DECRYPTION
# ============================================================================

def encrypt_block(block, expanded_key, sbox):
    """
    Encrypt a single 16-byte block
    """
    # Convert block to state matrix (column-major order)
    state = [
        [block[0], block[4], block[8], block[12]],
        [block[1], block[5], block[9], block[13]],
        [block[2], block[6], block[10], block[14]],
        [block[3], block[7], block[11], block[15]]
    ]
    
    # Initial round key addition
    add_round_key(state, expanded_key[:16])
    
    # Main rounds 1-9
    for rnd in range(1, 10):
        sub_bytes(state, sbox)
        shift_rows(state)
        mix_columns(state)
        add_round_key(state, expanded_key[rnd*16:(rnd+1)*16])
    
    # Final round (no MixColumns)
    sub_bytes(state, sbox)
    shift_rows(state)
    add_round_key(state, expanded_key[160:176])
    
    # Convert state back to bytes (column-major order)
    return bytes([
        state[0][0], state[1][0], state[2][0], state[3][0],
        state[0][1], state[1][1], state[2][1], state[3][1],
        state[0][2], state[1][2], state[2][2], state[3][2],
        state[0][3], state[1][3], state[2][3], state[3][3]
    ])

def decrypt_block(block, expanded_key, inv_sbox):
    """
    Decrypt a single 16-byte block
    """
    # Convert block to state matrix (column-major order)
    state = [
        [block[0], block[4], block[8], block[12]],
        [block[1], block[5], block[9], block[13]],
        [block[2], block[6], block[10], block[14]],
        [block[3], block[7], block[11], block[15]]
    ]
    
    # Reverse final round
    add_round_key(state, expanded_key[160:176])
    inv_shift_rows(state)
    inv_sub_bytes(state, inv_sbox)
    
    # Reverse rounds 9 down to 1
    for rnd in range(9, 0, -1):
        add_round_key(state, expanded_key[rnd*16:(rnd+1)*16])
        inv_mix_columns(state)
        inv_shift_rows(state)
        inv_sub_bytes(state, inv_sbox)
    
    # Reverse initial round
    add_round_key(state, expanded_key[:16])
    
    # Convert state back to bytes (column-major order)
    return bytes([
        state[0][0], state[1][0], state[2][0], state[3][0],
        state[0][1], state[1][1], state[2][1], state[3][1],
        state[0][2], state[1][2], state[2][2], state[3][2],
        state[0][3], state[1][3], state[2][3], state[3][3]
    ])

# ============================================================================
# CBC MODE ENCRYPTION/DECRYPTION (OPTIMIZED)
# ============================================================================

def aes_encrypt_cbc(plaintext: bytes, key: bytes, sbox: list, iv: bytes) -> bytes:
    """
    AES-128 CBC Encryption with custom S-box (OPTIMIZED)
    """
    # PKCS7 padding
    pad_len = 16 - (len(plaintext) % 16)
    padded = plaintext + bytes([pad_len] * pad_len)
    
    # Key expansion (done once)
    expanded_key = key_expansion(key, sbox)
    
    # Use bytearray for efficient concatenation
    result = bytearray()
    prev_block = iv
    
    # Process blocks
    for i in range(0, len(padded), 16):
        block = padded[i:i+16]
        # XOR with previous block
        xored = bytes(b ^ p for b, p in zip(block, prev_block))
        # Encrypt
        encrypted = encrypt_block(xored, expanded_key, sbox)
        result.extend(encrypted)
        prev_block = encrypted
    
    return bytes(result)

def aes_decrypt_cbc(ciphertext: bytes, key: bytes, inv_sbox: list, iv: bytes) -> bytes:
    """
    AES-128 CBC Decryption with custom inverse S-box (OPTIMIZED)
    """
    # Generate forward S-box for key expansion
    sbox = generate_sbox_from_inverse(inv_sbox)
    expanded_key = key_expansion(key, sbox)
    
    # Use bytearray for efficient concatenation
    result = bytearray()
    prev_block = iv
    
    # Process blocks
    for i in range(0, len(ciphertext), 16):
        block = ciphertext[i:i+16]
        # Decrypt
        decrypted = decrypt_block(block, expanded_key, inv_sbox)
        # XOR with previous block
        plaintext_block = bytes(d ^ p for d, p in zip(decrypted, prev_block))
        result.extend(plaintext_block)
        prev_block = block
    
    # Remove PKCS7 padding
    if result:
        pad_len = result[-1]
        if 1 <= pad_len <= 16 and all(b == pad_len for b in result[-pad_len:]):
            result = result[:-pad_len]
    
    return bytes(result)

# ============================================================================
# IMAGE ENCRYPTION/DECRYPTION (OPTIMIZED)
# ============================================================================

def aes_encrypt_image(image_bytes: bytes, key: bytes, sbox: list, iv: bytes) -> bytes:
    """
    AES-128 CBC Encryption for image data (OPTIMIZED)
    
    Uses bytearray for efficient memory operations.
    """
    # PKCS7 padding
    pad_len = 16 - (len(image_bytes) % 16)
    padded_data = image_bytes + bytes([pad_len] * pad_len)
    
    # Key expansion (done once)
    expanded_key = key_expansion(key, sbox)
    
    # Use bytearray for efficient concatenation
    result = bytearray()
    prev_block = iv
    total_blocks = len(padded_data) // 16
    
    # Process blocks
    for i in range(0, len(padded_data), 16):
        block = padded_data[i:i+16]
        # XOR with previous ciphertext block (CBC)
        xored = bytes(b ^ p for b, p in zip(block, prev_block))
        # Encrypt
        encrypted = encrypt_block(xored, expanded_key, sbox)
        result.extend(encrypted)
        prev_block = encrypted
    
    return bytes(result)

def aes_decrypt_image(encrypted_bytes: bytes, key: bytes, inv_sbox: list, iv: bytes) -> bytes:
    """
    AES-128 CBC Decryption for image data (OPTIMIZED)
    """
    # Generate forward S-box for key expansion
    sbox = generate_sbox_from_inverse(inv_sbox)
    expanded_key = key_expansion(key, sbox)
    
    # Use bytearray for efficient concatenation
    result = bytearray()
    prev_block = iv
    
    # Process blocks
    for i in range(0, len(encrypted_bytes), 16):
        block = encrypted_bytes[i:i+16]
        # Decrypt
        decrypted = decrypt_block(block, expanded_key, inv_sbox)
        # XOR with IV or previous ciphertext block
        plaintext_block = bytes(d ^ p for d, p in zip(decrypted, prev_block))
        result.extend(plaintext_block)
        prev_block = block
    
    # Remove PKCS7 padding
    if result:
        pad_len = result[-1]
        if 1 <= pad_len <= 16 and all(b == pad_len for b in result[-pad_len:]):
            result = result[:-pad_len]
    
    return bytes(result)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def generate_inv_sbox(sbox):
    """Generate inverse S-box from forward S-box"""
    inv_sbox = [0] * 256
    for i, val in enumerate(sbox):
        inv_sbox[val] = i
    return inv_sbox

def generate_sbox_from_inverse(inv_sbox: list) -> list:
    """Generate forward S-box from inverse S-box"""
    sbox = [0] * 256
    for i in range(256):
        sbox[inv_sbox[i]] = i
    return sbox