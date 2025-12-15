#!/bin/bash
# Script to create PNG icons from SVG
# Requires ImageMagick or similar tool

# Create 32x32 icons
convert -background none -resize 32x32 favicon.svg icon-light-32x32.png
convert -background "#181818" -resize 32x32 favicon.svg icon-dark-32x32.png

# Create 180x180 apple icon
convert -background none -resize 180x180 icon.svg apple-icon.png

# Create favicon.ico (multi-size)
convert -background none favicon.svg -define icon:auto-resize=16,32,48 favicon.ico

echo "Icons created successfully!"
