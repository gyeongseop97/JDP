"""Original Midnight Pawn score. Offline renderer; the shipped game needs no Python.

Run with Python + NumPy to reproduce the stereo PCM WAV masters and score manifest.
Melodies and arrangement written for this game; no external recordings or samples.
"""
from pathlib import Path
import json
import wave
import numpy as np

ROOT = Path(__file__).resolve().parent/'rendered-masters'
ROOT.mkdir(exist_ok=True)
SR = 32000
RNG = np.random.default_rng(660930)

def midi(note):
    if note == '-':
        return None
    keys = {'C':0, 'D':2, 'E':4, 'F':5, 'G':7, 'A':9, 'B':11}
    accidental = (1 if '#' in note else -1 if 'b' in note else 0)
    return 12 * (int(note[-1]) + 1) + keys[note[0]] + accidental

def voice(note, duration, instrument='pulse', level=.1):
    f = 440 * 2 ** ((midi(note) - 69) / 12)
    release = .065 if instrument != 'bell' else .19
    t = np.arange(round((duration + release) * SR)) / SR
    bend = .0017*np.sin(2*np.pi*5*t)*np.minimum(t/.2, 1)
    phase = 2*np.pi*f*(t + np.cumsum(bend)/SR)
    x = np.zeros(len(t))
    # Band-limited chip oscillators: cap high harmonics for a gentle, clean timbre.
    if instrument in ('pulse','pluck'):
        duty = .25 if instrument == 'pulse' else .375
        for k in range(1, min(22, int(6500/f))+1):
            x += (2*np.sin(np.pi*k*duty)/(np.pi*k))*np.cos(k*phase-np.pi*k*duty) * np.exp(-k/15)
    elif instrument == 'triangle':
        for k in range(1,min(18,int(5500/f))+1,2):
            x += 8/np.pi**2 * (-1)**((k-1)//2) * np.sin(k*phase)/k**2
    else:
        x = np.sin(phase)+.25*np.sin(2*phase)*np.exp(-t*8)+.08*np.sin(3*phase)*np.exp(-t*13)
    attack = np.minimum(t/.005,1)
    if instrument == 'pluck':
        env = np.exp(-t*8)*.85+.15
    elif instrument == 'bell':
        env = np.exp(-t*4)
    else:
        env = .78+.22*np.exp(-t*14)
    tail = np.clip((duration+release-t)/release,0,1)**2
    return x*attack*env*tail*level

def drum(kind):
    length = .16 if kind == 'kick' else .09 if kind == 'snare' else .035
    t = np.arange(round(length*SR))/SR
    if kind == 'kick':
        x = np.sin(2*np.pi*(49*t+50*(1-np.exp(-t*32))/32))*np.exp(-t*28)*.19
    else:
        noise = RNG.uniform(-1,1,len(t))
        noise = np.concatenate(([0],np.diff(noise)))
        x = noise*np.exp(-t*(48 if kind=='snare' else 115))*(.043 if kind=='snare' else .016)
        if kind == 'snare':
            x += .025*np.sin(2*np.pi*185*t)*np.exp(-t*45)
    return x*np.minimum(t/.002,1)*np.minimum((length-t)/.008,1)

def add(buf, samples, seconds, pan=0):
    idx = (round(seconds*SR)+np.arange(len(samples))) % len(buf)
    gains = np.array([np.cos((pan+1)*np.pi/4), np.sin((pan+1)*np.pi/4)])
    # Wrap release tails into the opening: no gap or clipped tail at the loop seam.
    for c in range(2):
        np.add.at(buf[:,c],idx,samples*gains[c])

CHORDS = {
    'Dm': ('D2',['D4','F4','A4','E5']),
    'Dm6':('D2',['D4','F4','A4','B4']),
    'Gm': ('G2',['G3','Bb3','D4','A4']),
    'A7': ('A2',['A3','C#4','E4','G4']),
    'Bb': ('Bb2',['Bb3','D4','F4','A4']),
    'F':  ('F2',['F4','A4','C5','E5']),
    'C':  ('C3',['C4','E4','G4','B4']),
    'Edim':('E2',['E4','G4','Bb4','D5']),
}

# Each phrase is a complete four-beat bar, including intentional breaths.
SHOP_A = [
 'D5:.5 -:.25 F5:.25 A5:.5 F5:.5 E5:.5 D5:.5 A4:.5 -:.5',
 'D5:.75 F5:.25 A5:.5 B5:.25 A5:.25 F5:.5 E5:.5 D5:.5 -:.5',
 'G5:.5 D5:.5 Bb4:.5 D5:.5 F5:.75 E5:.25 D5:.5 -:.5',
 'E5:.5 G5:.5 C#5:.5 E5:.5 A4:.75 C#5:.25 E5:.5 -:.5',
 'F5:.75 D5:.25 Bb4:.5 D5:.5 F5:.5 A5:.5 G5:.5 F5:.5',
 'G5:.5 F5:.5 D5:.75 Bb4:.25 D5:.5 G5:.5 A5:.5 -:.5',
 'G5:.5 E5:.5 Bb4:.5 E5:.5 G5:.75 F5:.25 E5:.5 -:.5',
 'C#5:.5 E5:.5 G5:.5 E5:.5 C#5:.5 A4:.5 C#5:.5 -:.5',
]
SHOP_B = [
 'A5:1 C6:.5 A5:.5 G5:.5 F5:.5 E5:.5 -:.5',
 'G5:.75 E5:.25 C5:.5 E5:.5 G5:.5 B5:.5 G5:.5 -:.5',
 'A5:.5 F5:.5 D5:1 E5:.5 F5:.5 A5:.5 -:.5',
 'Bb5:.75 A5:.25 G5:.5 D5:.5 F5:.5 G5:.5 D5:.5 -:.5',
 'F5:.5 Bb5:.5 A5:.5 F5:.5 D5:.75 F5:.25 A5:.5 -:.5',
 'E5:.5 G5:.5 Bb5:.5 G5:.5 E5:.5 D5:.5 Bb4:.5 -:.5',
 'C#5:.5 E5:.5 G5:.5 A5:.5 G5:.5 E5:.5 C#5:.5 -:.5',
 'E5:.75 C#5:.25 A4:1 -:.5 E5:.5 C#5:.5 -:.5',
]
TITLE = [
 'D5:1 A5:.5 F5:.5 E5:.75 D5:.25 -:1',
 'F5:.5 A5:.5 B5:.5 A5:.5 F5:1 -:1',
 'G5:1 D5:.5 Bb4:.5 D5:1 -:1',
 'C#5:.5 E5:.5 G5:1 E5:.5 C#5:.5 -:1',
 'F5:1 D5:.5 Bb4:.5 A4:.5 Bb4:.5 D5:.5 F5:.5',
 'G5:.75 F5:.25 D5:1 Bb4:.5 D5:.5 -:1',
 'E5:.5 G5:.5 Bb5:.5 G5:.5 E5:1 -:1',
 'C#5:.75 E5:.25 A5:1 G5:.5 E5:.5 C#5:.5 -:.5',
]
NIGHT = [
 'D5:1.5 F5:.5 E5:1 -:1',
 'A4:1 D5:1 B4:1 -:1',
 'Bb4:1.5 D5:.5 A4:1 -:1',
 'G4:1 Bb4:.5 D5:.5 A4:1 -:1',
 'A4:1.5 C5:.5 F5:1 -:1',
 'E5:1 G5:.5 E5:.5 D5:1 -:1',
 'Bb4:1 E5:1 G5:.5 E5:.5 -:1',
 'C#5:1 E5:1 A4:1 -:1',
]

def render(key, title, bpm, chords, phrases, mood):
    beat=60/bpm
    buf=np.zeros((round(len(chords)*4*beat*SR),2),dtype=np.float64)
    for bar, chord in enumerate(chords):
        root, tones=CHORDS[chord]
        base=bar*4*beat
        phrase=phrases[bar%len(phrases)]
        pos=0
        for token in phrase.split():
            note, dur=token.split(':');dur=float(dur)
            if note != '-':
                inst='bell' if mood=='night' or (mood=='title' and bar<8) else 'pulse'
                # A second eight-bar pass changes texture instead of filling every beat.
                level=.135 if inst=='pulse' else .15
                part=voice(note,dur*beat*.72,inst,level)
                add(buf,part,base+pos*beat,-.12)
                add(buf,part*.13,base+pos*beat+beat*.75,.42)
            pos+=dur
        assert abs(pos-4)<1e-9,(bar,pos,phrase)
        # Warm triangle bass, tiny off-beat pulse chords and understated chip drums.
        fifth=tones[2][:-1]+'3'
        for step,note in [(0,root),(1.5,fifth),(2,root),(3.5,fifth)]:
            add(buf,voice(note,beat*.38,'triangle',.18 if mood!='night' else .12),base+step*beat)
        for k in range(8):
            swing=.08 if k%2 and mood=='shop' else 0
            n=tones[[0,2,1,3,2,1,3,2][k]]
            add(buf,voice(n,beat*.16,'pluck',.034 if mood=='shop' else .028),base+(k*.5+swing)*beat,.32)
        if mood!='night':
            for k in [0,2]: add(buf,drum('kick'),base+k*beat)
            for k in [1,3]: add(buf,drum('snare')*(.7 if mood=='title' else 1),base+k*beat)
            for k in range(8): add(buf,drum('hat'),base+(k*.5+(.08 if k%2 else 0))*beat,.2)
        elif bar%2:
            add(buf,drum('hat')*.7,base+3*beat,.2)
    buf-=buf.mean(axis=0)
    # A common gain retains the softer night arrangement; plenty of SFX headroom.
    buf*=1.8
    peak=float(np.max(np.abs(buf)))
    assert peak<.88,peak
    pcm=np.round(np.clip(buf,-1,1)*32767).astype('<i2')
    out=ROOT/(key+'.wav')
    with wave.open(str(out),'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(SR);wav.writeframes(pcm.tobytes())
    result={'id':key,'title':title,'file':'music/'+out.name,'bpm':bpm,'bars':len(chords),'duration':len(buf)/SR,'sampleRate':SR,'frames':len(buf),'peak':round(peak,4),'rms':round(float(np.sqrt(np.mean(buf*buf))),4),'seamDelta':round(float(np.max(np.abs(buf[-1]-buf[0]))),5)}
    print(json.dumps(result,ensure_ascii=False))
    return result

if __name__=='__main__':
    a=['Dm','Dm6','Gm','A7','Bb','Gm','Edim','A7']
    b=['F','C','Dm','Gm','Bb','Edim','A7','A7']
    tracks=[
        render('moonlit-sign','달빛 아래 간판',112,a*3,TITLE,'title'),
        render('odd-little-bargain','수상한 흥정',104,a*2+b+a,SHOP_A*2+SHOP_B+SHOP_A,'shop'),
        render('after-the-last-guest','마지막 손님이 떠난 뒤',84,['Dm','Dm6','Bb','Gm','F','C','Edim','A7']*2,NIGHT,'night'),
    ]
    (ROOT/'score.json').write_text(json.dumps({'version':1,'original':True,'tracks':tracks},ensure_ascii=False,indent=2),encoding='utf-8')
