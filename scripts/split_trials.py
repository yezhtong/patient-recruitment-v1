# -*- coding: utf-8 -*-
"""把 raw.json 拆成每个试验一个 .txt，并尝试再清洗一次"""
import json
import re
from pathlib import Path

SRC = Path(r"e:/Projects/03_患者招募/scripts/招募文件2_raw.json")
OUT_DIR = Path(r"e:/Projects/03_患者招募/scripts/招募文件2_txt")
OUT_DIR.mkdir(exist_ok=True)


def clean(text: str) -> str:
    # 去掉非中文/非 ASCII 可打印字符长段
    keep = []
    for ch in text:
        code = ord(ch)
        if 0x4E00 <= code <= 0x9FFF:
            keep.append(ch)
        elif ch in "，。、；：！？·（）《》【】〔〕［］｛｝—·.,;:!?()[]{}<>“”‘’\"' \n\t0123456789+-/\\*%~^@|":
            keep.append(ch)
        elif 0x20 <= code <= 0x7E:
            keep.append(ch)
        # 忽略其它（替换为空）
    out = "".join(keep)
    out = re.sub(r"[ \t]{2,}", " ", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def sanitize_filename(name: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', "_", name).strip()


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    for i, item in enumerate(data, 1):
        name = item["file"]
        text = clean(item["text"])
        fname = f"{i:02d}_{sanitize_filename(name)}.txt"
        (OUT_DIR / fname).write_text(text, encoding="utf-8")
        print(f"{fname}  {len(text)} chars")
    print(f"\n=> {OUT_DIR}")


if __name__ == "__main__":
    main()
