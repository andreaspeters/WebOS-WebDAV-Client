for i in *
do
  FILE=$i
  MIMETYPE=`echo $i | sed -e 's/\-/\//'`
  echo        case \"$MIMETYPE\"\: return \"images/mimetype/$FILE\"\;
done
