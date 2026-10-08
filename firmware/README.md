# Braille printer: ulash va ishlatish

Printer: **Arduino (Mega) + Marlin 1.0.2**, **COM3**, 115200 baud. Nuqtani **Z motori** bosadi.
Arduino IDE, Pronterface va boshqa dasturlar kerak emas — hammasi Braille Vision ilovasida.

```
Brauzer (ilova)  ⇄  HTTP  ⇄  server/bridge.py (Python)  ⇄  COM3  ⇄  Arduino (Marlin)
```

## 1. Ishga tushirish

Bir marta (Node.js va Python 3.10+ kerak):

```bash
npm install
```

```bash
python -m pip install -r server/requirements.txt
```

Hammasi bitta buyruqda (keyin http://localhost:3001 ni oching):

```bash
npm start
```

Yoki ishlab chiqish rejimida ikki terminalda — `npm run bridge` va `npm run dev` (http://localhost:3000).

> COM3 ni boshqa dastur (Arduino IDE, Pronterface, Cura) band qilmagan bo'lsin.
> Port boshqa bo'lsa: `SERIAL_PORT=COM5 python server/bridge.py`.

## 2. PRINTER paneli

| Tugma | Buyruq | Nima qiladi |
|---|---|---|
| **Ulash (COM3)** | — | Portni ochadi (Arduino qayta yuklanadi, ~2.5 s), so'ng `G92 X100 Y100 Z5` |
| **X− / X+ / Y− / Y+** | `G91` `G0 …` `G90` | 1 / 10 / 50 mm siljitadi |
| **Shu yer — nol nuqta** | `G92 X0 Y0 Z5` | Joriy joy qog'ozning (0,0) nuqtasi; Z hozir "tepada" deb belgilanadi |
| **Test nuqta** | `G92 Z5` `G1 Z4.5` `G1 Z5` | Bitta nuqta bosadi |
| **Joylashuv (M114)** | `M114` | Joriy koordinata |
| **Sozlamalar (M503)** | `M503` | Steps/mm, tezlik, tezlanish |
| **Chop etish** | — | G-code'ni qatorma-qator yuboradi, har biriga `ok` kutadi |
| **To'xtatish** | DTR reset | Arduino'ni qayta yuklaydi — harakat darhol to'xtaydi |
| Konsol | istalgan | `G0 X10`, `M114`, `M92 X177.8` … |

## 3. Z bilan bosish qanday ishlaydi

Marlin Z'ni **0 dan pastga tushirmaydi** (software endstop). Shuning uchun:

- Dastur boshida bosh **tepada** turibdi va bu balandlik `Z Rest` (standart 5 mm) deb e'lon qilinadi: `G92 Z5`.
- Har bir nuqta: `G1 Z{Rest − Depth}` → `G1 Z{Rest}`.
- **Bosh har doim tepada turgan holda** "Chop etish" yoki "Test nuqta" ni bosing.

⚙ Settings'dagi sozlamalar:

| Maydon | Ma'nosi |
|---|---|
| **Punch Depth (mm, − = +Z)** | Bosish yo'li. Motor teskari yursa (bosh pastga emas, tepaga ketsa) — **manfiy** qiymat kiriting, masalan `-0.5` |
| **Punch Speed (mm/min)** | Z tezligi |
| **Z Rest (mm)** | Virtual "tepa" balandligi. `Punch Depth` dan katta bo'lsin |

## 4. Birinchi sinov (tartib bilan)

1. **Ulash (COM3)** → konsolda `start` va `echo:Marlin 1.0.2+` chiqadi.
2. **X+ 10 mm** → karetka yuradimi? **Y+ 10 mm** → qog'oz yuradimi?
   Yo'nalish teskari bo'lsa — hozircha qog'ozni/matnni shunga moslang (Marlin 1.0.2 da yo'nalish firmware'da sozlanadi).
3. Settings → **Punch Depth = 0.2** (kichikdan boshlang) → **Test nuqta**.
   - Bosh tepaga ketsa → `-0.2` qiling.
   - Nuqta sezilmasa → 0.1 mm qadam bilan oshiring.
4. Chizg'ich bilan: **X+ 50 mm** haqiqatda 50 mm yurdimi? Yo'q bo'lsa steps/mm ni to'g'rilang:
   `yangi = 177.8 × 50 / o'lchangan` → konsolda `M92 X<yangi>` (Y uchun `M92 Y…`).
   ⚠ Bu firmware'da EEPROM o'chiq (`Hardcoded Default Settings Loaded`) — `M92` qayta yuklanguncha saqlanadi.
5. Qog'oz burchagi → **Shu yer — nol nuqta** → bitta harf ("a") bilan **Chop etish**.

## 4a. Test fayllari (`printer_tests/`)

Bridge ishlab turganda (`npm start`) **ikkinchi terminalda** ishga tushiriladi. Ilova ochiq tursa ham bo'ladi.
Har bir test boshlanishidan oldin tasdiq so'raydi; **Ctrl+C** — favqulodda to'xtatish.

| Fayl | Nimani tekshiradi | Harakat |
|---|---|---|
| `00_info.gcode` | Aloqa, firmware, joylashuv | yo'q |
| `01_axes.gcode` | X/Y yo'nalishi | X, Y ±10 mm |
| `02a_depth_down.gcode` | Bosish chuqurligi (−Z) | 3 nuqta: 0.2 / 0.4 / 0.6 mm |
| `02b_depth_up.gcode` | Xuddi shu, Z teskari bo'lsa (+Z) | 3 nuqta |
| `03_scale_square.gcode` | Masshtab (steps/mm) | 50×50 mm kvadrat, 4 nuqta |
| `04_braille_cell.gcode` | To'liq yacheyka ⠿ | 6 nuqta |
| `05_abc.gcode` | Ilova generatori: "abc" | 5 nuqta |

```bash
python server/run_gcode.py printer_tests/00_info.gcode
```

`03`–`05` uchun 2-testda topilgan chuqurlikni bering (+Z bo'lsa manfiy):

```bash
python server/run_gcode.py printer_tests/04_braille_cell.gcode --depth 0.4
```

## 5. Hozirgi Marlin sozlamalari (M503)

```
M92 X177.80 Y177.80 Z80.00 E836.00     ; steps/mm
M203 X5000 Y5000 Z5000 E25             ; max tezlik (mm/s)
M201 X9000 Y9000 Z100 E10000           ; max tezlanish (mm/s²)
M204 S4000 T4000
```

## 6. Muammolar

| Belgisi | Sabab / yechim |
|---|---|
| `Bridge ishlamayapti` | `npm run bridge` (yoki `npm start`) ishga tushmagan |
| `No module named 'serial'` | `python -m pip install -r server/requirements.txt` |
| `COM3 band — boshqa dastur ishlatyapti` | Boshqa dasturni yoping yoki USB'ni uzib-ulang |
| `COM3 topilmadi` | Arduino ulanmagan yoki port raqami boshqa (Device Manager → Ports) |
| X−/Y− yurmaydi | Nol nuqtadan pastga — Marlin ruxsat bermaydi. Uzish → Ulash qiling |
| Z umuman qimirlamaydi | `Punch Depth` ishorasini almashtiring yoki `Z Rest` ni oshiring |
| Buyruq "osilib" qoldi | **To'xtatish** → Uzish → Ulash |

## Lazer stanok (Makeblock mLaser yoki GRBL)

Settings → **Firmware**:
- **Makeblock mLaser — laser**: mLaser dasturi bilan kelgan stanok (Makeblock'ning Marlin 1.0.2 proshivkasi, `M115` → `Marlin 1.0.2+`). Lazer `M4 P0..255` bilan boshqariladi (mLaser'ning `firsttest.gcode` namunasidan olingan). Har bir nuqta: `M400` → `M4 P<quvvat>` → `G4 P<ms>` → `M4 P0`.
- **GRBL — laser**: GRBL 1.1 stanoklar (`$I` → `[VER:1.1...]`). Har bir nuqta: `M3 S<quvvat>` → `G4 P<soniya>` → `M5`.

**Laser power** (%) va **Laser time per dot** (ms) ni **Test dot (laser)** bilan qog'oz parchasida tanlang. Boshlash: 30–50 %, 50–100 ms.

1. **mLaser'ni yoping** (u portni band qiladi). Printer panelida portni tanlang (↻ ro'yxatni yangilaydi). Tanlov eslab qolinadi.
2. **Connect** → Console'da `M115` (Marlin/mLaser) yoki `$I` (GRBL) bilan proshivkani tekshiring.
3. GRBL: `ALARM` yoki `error:9` chiqsa — **Unlock ($X)**. Nuqta kuymasa va `$32=1` bo'lsa, `$32=0` bilan sinang.

Terminaldan: `python server/run_gcode.py fayl.gcode --port COM4`

> Lazer qog'ozni **kuydiradi** — barmoq bilan seziladigan bo'rtiq nuqta chiqmaydi. Ko'zoynak taqing, stanokni qarovsiz qoldirmang.
