# backend/sbox_generator.py

import numpy as np

# --- 1. GALOIS FIELD (GF 2^8) UTILITIES ---
AES_MODULUS = 0x11B

def gf_multiply(a, b):
    """Perkalian Galois Field GF(2^8)"""
    p = 0
    for i in range(8):
        if (b & 1) != 0:
            p ^= a
        hi_bit_set = (a & 0x80) != 0
        a <<= 1
        if hi_bit_set:
            a ^= 0x11B
        b >>= 1
    return p % 256

def gf_inverse(byte):
    """Mencari Multiplicative Inverse di GF(2^8). Jika 0 -> 0."""
    if byte == 0:
        return 0
    for i in range(1, 256):
        if gf_multiply(byte, i) == 1:
            return i
    return 0

# Pre-compute Inverse Table untuk efisiensi
INVERSE_TABLE = [gf_inverse(x) for x in range(256)]

# --- 2. AFFINE TRANSFORMATION LOGIC (STANDARD) ---

def apply_affine_transform(byte_val, matrix_rows, constant):
    """
    STANDARD VERSION: Logika Affine Transform Murni (Tanpa Bit Reversal Hack).
    
    Masalah "Fixed Points 2" sebelumnya disebabkan oleh TYPO di matrices.py,
    bukan karena logika fungsi ini salah.
    
    Rumus: S(x) = M * x^(-1) XOR C
    """
    # Langkah 1: Ambil invers
    inverse_val = INVERSE_TABLE[byte_val]
    
    # Langkah 2: Perkalian Matriks (Standard LSB-first logic)
    result = 0
    for i in range(8):
        # Ambil baris ke-i dari matriks
        row = matrix_rows[i]
        
        # Hitung dot product (AND) lalu Parity
        # Jika parity ganjil -> bit ke-i adalah 1
        if bin(inverse_val & row).count('1') % 2 == 1:
            result |= (1 << i)
            
    # Langkah 3: XOR Konstanta
    return result ^ constant

def generate_sbox(matrix_rows, constant):
    """
    Membuat S-box lengkap (256 nilai).
    """
    sbox = []
    for x in range(256):
        val = apply_affine_transform(x, matrix_rows, constant)
        sbox.append(val)
    return sbox

# --- 3. VALIDATION HELPER (DIAGNOSTIC) ---

def validate_aes_sbox(sbox):
    """
    Validasi S-box terhadap standar AES.
    Juga mendeteksi jika Matriks Input salah.
    """
    # Nilai referensi (Standar FIPS 197)
    aes_ref = {0x00: 0x63, 0x01: 0x7C, 0xFF: 0x16}
    
    # Cek Sampel Nilai
    matches = []
    for idx, expected in aes_ref.items():
        matches.append(sbox[idx] == expected)
    
    # Cek Fixed Points (Harus 0)
    fixed_points = sum(1 for i in range(256) if sbox[i] == i)
    
    # Cek Max Cycle (Harus 87)
    # (Logic sederhana untuk cycle)
    visited = [False] * 256
    max_cycle = 0
    for i in range(256):
        if not visited[i]:
            curr, count = i, 0
            while not visited[curr]:
                visited[curr] = True
                curr = sbox[curr]
                count += 1
            if count > max_cycle: max_cycle = count

    return {
        'is_valid': all(matches) and fixed_points == 0,
        'fixed_points': fixed_points,
        'max_cycle': max_cycle,
        'samples': {k: hex(sbox[k]) for k in aes_ref}
    }