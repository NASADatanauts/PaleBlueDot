#!/bin/bash

set -e

fnames=""
for i in $(jq -r '[[.[].date],[.[].image]] | transpose | map(.[0][0:10] + "/" + .[1]) | .[]' $1); do
    date=$(echo $i | cut -d/ -f1)
    y=$(echo $date | cut -d- -f1)
    m=$(echo $date | cut -d- -f2)
    d=$(echo $date | cut -d- -f3)
    f=$(echo $i | cut -d/ -f2)
    convert tmp/nasaimages/$f.png -strip -quality 80 -resize '>1024x1024' tmp/nasaimages/$f.jpg
    convert tmp/nasaimages/$f.png -resize '>256x256' tmp/nasaimages/$f-thumb.ppm
    cjpeg -dct float -quality 60 -scans concat.scans tmp/nasaimages/$f-thumb.ppm >tmp/nasaimages/$f-thumb.jpg
    fnames="$fnames tmp/nasaimages/$f.png"
done

convert -append $fnames -resize '>256x256' tmp/nasaimages/$y-$m-$d.ppm
cjpeg -dct float -quality 60 -scans concat.scans tmp/nasaimages/$y-$m-$d.ppm >tmp/nasaimages/$y-$m-$d.jpg
