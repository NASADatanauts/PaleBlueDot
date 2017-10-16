#!/bin/bash

set -e

rm -rf tmp/nasaimages
mkdir -p tmp/nasaimages

for i in $(jq -r '[[.[].date],[.[].image]] | transpose | map(.[0][0:10] + "/" + .[1]) | .[]' $1); do
    date=$(echo $i | cut -d/ -f1)
    y=$(echo $date | cut -d- -f1)
    m=$(echo $date | cut -d- -f2)
    d=$(echo $date | cut -d- -f3)
    f=$(echo $i | cut -d/ -f2)
    curl -s -o tmp/nasaimages/$f.png https://epic.gsfc.nasa.gov/archive/natural/$y/$m/$d/png/$f.png
done
