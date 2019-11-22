#!/bin/bash

set -e

unset PROMPT_COMMAND

./bin/run devices
./bin/run devices --format json

./bin/run lattices
./bin/run lattices --format json-pretty
./bin/run lattices -n=2

./bin/run qmis
./bin/run qmis --format json-pretty
./bin/run qmis --stop -i $QMI_ID
./bin/run qmis --start -i $QMI_ID

echo "y" | ./bin/run reserve --list -l $LATTICE_NAME
echo "y" | ./bin/run reserve -l $LATTICE_NAME
./bin/run reservations --format json

RESERVATIONS=$(./bin/run reservations)
# This grabs the first reservation id in the table
# (it is the first sequence of digits).
if [[ $RESERVATIONS =~ [[:digit:]]+  ]]
then
    echo "y" | ./bin/run cancel -i ${BASH_REMATCH}
else
    echo $RESERVATIONS
    echo "could not parse reservations"
    exit 1
fi

./bin/run reserve -l $LATTICE_NAME --confirm
RESERVATIONS=$(./bin/run reservations)
if [[ $RESERVATIONS =~ $RESERVATION_ID_REGEXP  ]]
then
    RESERVATION_ID="${BASH_REMATCH[1]}"
    ./bin/run cancel --confirm -i ${RESERVATION_ID}
else
    echo $RESERVATIONS
    echo "could not parse reservations"
    exit 1
fi

exit 0
