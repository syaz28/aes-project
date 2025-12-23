import requests

# Test data
TEST_TEXT = 'Hello World from AES'
KEY = '00112233445566778899AABBCCDDEEFF'

print('=== Testing Text Encrypt/Decrypt with Embedded IV ===')
print(f'Original text: {TEST_TEXT}')

# ENCRYPT
enc_resp = requests.post('http://localhost:8000/encrypt', json={
    'plaintext': TEST_TEXT,
    'key': KEY,
    'matrix_name': 'K44',
    'constant': '0x63',
    'mode': 'CBC'
})

if enc_resp.status_code == 200:
    enc_data = enc_resp.json()
    ciphertext = enc_data['ciphertext']
    print(f'\nEncrypt OK')
    print(f'Ciphertext length: {len(ciphertext)} chars')
    print(f'First 32 chars (IV): {ciphertext[:32]}')
    print(f'IV field (should be empty): "{enc_data["iv"]}"')
    
    # DECRYPT - only ciphertext and key, no IV needed!
    dec_resp = requests.post('http://localhost:8000/decrypt', json={
        'ciphertext': ciphertext,
        'key': KEY,
        'matrix_name': 'K44',
        'constant': '0x63',
        'mode': 'CBC'
    })
    
    if dec_resp.status_code == 200:
        dec_data = dec_resp.json()
        plaintext = dec_data['plaintext']
        print(f'\nDecrypt OK')
        print(f'Recovered text: {plaintext}')
        
        if plaintext == TEST_TEXT:
            print('\n*** SUCCESS: Text matches perfectly! ***')
        else:
            print('\n*** FAIL: Text mismatch ***')
    else:
        print(f'Decrypt FAILED: {dec_resp.text}')
else:
    print(f'Encrypt FAILED: {enc_resp.text}')
