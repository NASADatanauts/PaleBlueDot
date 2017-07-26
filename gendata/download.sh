#!/bin/bash

set -e

for i in `seq 0 40` ; do
  DATE=$(date -d "-$i days" +%Y-%m-%d)
  wget -q -O $DATE.json https://epic.gsfc.nasa.gov/api/natural/date/$DATE?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo
done
./convdata.py >allnasa.json.new
mv allnasa.json.new allnasa.json
