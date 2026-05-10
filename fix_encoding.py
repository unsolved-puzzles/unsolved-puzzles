"""Fix mojibake in HTML files.

The corruption path was: original UTF-8 bytes were misread as Windows-1252
(or Latin-1 for undefined cp1252 positions like 0x81, 0x8D, 0x8F, 0x90, 0x9D),
then the resulting chars were re-encoded as UTF-8.
"""
import glob


def char_to_byte(c):
    """Convert a mojibake char back to its original byte.
    
    Try cp1252 first (handles most mappings), fall back to latin-1
    for the 5 undefined cp1252 positions.
    """
    try:
        return c.encode("cp1252")
    except UnicodeEncodeError:
        return c.encode("latin-1")


def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as fh:
        text = fh.read()

    # Try encoding the whole file as cp1252 then decoding as utf-8
    try:
        fixed = text.encode("cp1252").decode("utf-8")
        if fixed != text:
            with open(filepath, "w", encoding="utf-8") as fh:
                fh.write(fixed)
            return True
    except (UnicodeDecodeError, UnicodeEncodeError):
        # File has a mix of correct and mojibake chars.
        # Use sliding window with hybrid cp1252/latin-1 encoding.
        out = []
        i = 0
        while i < len(text):
            fixed_chunk = False
            for window in (4, 3, 2):
                if i + window > len(text):
                    continue
                chunk = text[i:i + window]
                try:
                    raw_bytes = b"".join(char_to_byte(c) for c in chunk)
                    decoded = raw_bytes.decode("utf-8")
                    if decoded != chunk and len(decoded) < len(chunk):
                        out.append(decoded)
                        i += window
                        fixed_chunk = True
                        break
                except (UnicodeDecodeError, UnicodeEncodeError):
                    continue
            if not fixed_chunk:
                out.append(text[i])
                i += 1

        result = "".join(out)
        if result != text:
            with open(filepath, "w", encoding="utf-8") as fh:
                fh.write(result)
            return True

    return False


files = glob.glob("**/*.html", recursive=True)
count = 0
for f in files:
    if fix_file(f):
        print("Fixed: " + f)
        count += 1

print("Done. " + str(count) + " files fixed.")
