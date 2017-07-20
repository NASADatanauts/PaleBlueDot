#!/bin/bash

for i in `seq 40 1000` ; do
  DATE=$(date -d "-$i days" +%Y-%m-%d)
  wget -O $DATE.json https://epic.gsfc.nasa.gov/api/natural/date/$DATE?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo
done
