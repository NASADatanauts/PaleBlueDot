#!/bin/bash

set -e

./download-recent-jsons.sh

mkdir -p cdn tmp
./nasajsons-to-allnasa.py >tmp/allnasa.realjson
( echo -n "nasaarray = " ; cat tmp/allnasa.realjson ) >cdn/allnasa.json

for i in nasajsons-fixed/*.json ; do
  ./do-image-for-day.sh $i
  ./upload-day.sh $i
done

sleep 7200
./upload-allnasa.sh
