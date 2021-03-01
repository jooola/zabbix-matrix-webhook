#!/usr/bin/env bash

src="media_matrix.yml"
script="matrix.js"

line_number=$(grep -n 'script: |' "$src" | cut -d ':' -f1)

head -n "$line_number" "$src" > "$src.tmp"                # Keep head of the file
sed -r -e 's/^(\S*)/        \1/g' "$script" >> "$src.tmp" # Insert script
sed -i 's/[[:space:]]*$//' "$src.tmp"                     # Remove trailing spaces

mv "$src.tmp" "$src"
