#!/bin/bash

set -e

. .sshpw

olddate=
for i in $(jq -r '[[.[].date],[.[].image]] | transpose | map(.[0][0:10] + "/" + .[1]) | .[]' $1); do
    date=$(echo $i | cut -d/ -f1)
    y=$(echo $date | cut -d- -f1)
    m=$(echo $date | cut -d- -f2)
    d=$(echo $date | cut -d- -f3)
    if [ -e upload-day-done/$date ]; then exit 0; fi
    if ! [ -e image-day-done/$date ]; then echo upload for not finished images $date ; exit 1 ; fi

    cd cdn
    lftp -c "open sftp://nasa.kj58yy565gqqhv2gx:$SSHPASS@ftp.nasa.kj58yy565gqqhv2gx.maxcdn-edge.com && cd public_html && mput -d images/$y/$m/$d/*" </dev/null >/dev/null
    cd ..
    mkdir -p upload-day-done
    touch upload-day-done/$date
    break
done
