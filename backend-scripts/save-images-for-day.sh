#!/bin/bash

set -e

olddate=
for i in $(jq -r '[[.[].date],[.[].image]] | transpose | map(.[0][0:10] + "/" + .[1]) | .[]' $1); do
    date=$(echo $i | cut -d/ -f1)
    y=$(echo $date | cut -d- -f1)
    m=$(echo $date | cut -d- -f2)
    d=$(echo $date | cut -d- -f3)
    out="cdn/images/$y/$m/$d"
    if [ "$olddate" = "" ]; then
	olddate=$date
	rm -rf $out
	mkdir -p $out
    fi
    if [ "$olddate" != "$date" ]; then
	echo nasa date error
	exit 1
    fi
    f=$(echo $i | cut -d/ -f2)
    mv tmp/nasaimages/$f.jpg $out
    mv tmp/nasaimages/$f-thumb.jpg $out
done

mv tmp/nasaimages/$y-$m-$d.jpg $out
