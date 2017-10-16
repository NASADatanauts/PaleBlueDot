#!/usr/bin/python

import json
from pprint import pprint
import datetime
from time import gmtime, strftime, strptime
import sys

start_date = datetime.date(2015, 10, 12)
end_date = datetime.date.today()

d = start_date
delta = datetime.timedelta(days=1)

rows = []
while d <= end_date:
    strdate = d.strftime("%Y-%m-%d")

    try:
        with open("nasajsons-fixed/%s.json" % strdate, "r") as f:
            j = json.loads(f.read())
            row = {}
            row['d'] = strdate
            row['l'] = []
            row['i'] = []
            for earth in j:
                row['l'].append(earth['centroid_coordinates']['lon'])
                row['i'].append(earth['image'])
            row['n'] = len(row['l'])
            if row['n'] > 0: rows.append(row)
    except:
        print >> sys.stderr, "Couldn't process %s" % strdate

    d += delta

print(json.dumps(rows, separators=(',',':')))
