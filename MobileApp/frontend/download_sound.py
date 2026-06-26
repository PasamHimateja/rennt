import wave
import math
import struct
 
def generate_wav():
    target_path = r"c:\Users\ROHITH KUMAR\OneDrive\Desktop\Rent\Rennto\rentt\rennto\HMS\frontend\assets\notification.wav"
    sample_rate = 44100
    duration = 0.5  # seconds
    frequency = 880.0  # Hz (A5)
   
    num_samples = int(sample_rate * duration)
   
    with wave.open(target_path, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
       
        for i in range(num_samples):
            # Apply an envelope to make it sound like a "ding"
            envelope = math.exp(-5 * i / num_samples)
            value = int(32767.0 * envelope * math.sin(2.0 * math.pi * frequency * i / sample_rate))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)
 
if __name__ == "__main__":
    generate_wav()
    print("Generated notification.wav")