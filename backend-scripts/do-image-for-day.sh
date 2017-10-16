#!/bin/bash

set -e

olddate=
for i in $(jq -r '[[.[].date],[.[].image]] | transpose | map(.[0][0:10] + "/" + .[1]) | .[]' $1); do
    date=$(echo $i | cut -d/ -f1)
    if [ -e image-day-done/$date ]; then exit 0; fi

    ./download-images-for-day.sh $1
    ./resize-images-for-day.sh $1
    ./save-images-for-day.sh $1

    mkdir -p image-day-done
    touch image-day-done/$date
    break
done
