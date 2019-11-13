#!/bin/bash

set -e

unset PROMPT_COMMAND

./bin/run devices

./bin/run lattices
./bin/run lattices -n=2

./bin/run qmis
./bin/run qmis --stop -i $QMI_ID
./bin/run qmis --start -i $QMI_ID

echo "y" | ./bin/run reserve -l $LATTICE_NAME

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

exit 0
