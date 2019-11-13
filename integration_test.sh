#!/bin/bash

set -e

ORIGINAL_PROMPT_COMMAND=$PROMPT_COMMAND
unset PROMPT_COMMAND

./bin/run devices

./bin/run lattices
./bin/run lattices -n=2

./bin/run qmis
./bin/run qmis --stop -i $QMI_ID
./bin/run qmis --start -i $QMI_ID

echo "y" | ./bin/run reserve -l $LATTICE_NAME

RESERVATIONS=$(./bin/run reservations)
RESERVATION_ID_REGEXP='PRICE[[:space:]]*([0-9]+)'
if [[ $RESERVATIONS =~ $RESERVATION_ID_REGEXP  ]]
then
    RESERVATION_ID="${BASH_REMATCH[1]}"
    echo "y" | ./bin/run cancel -i ${RESERVATION_ID}
else
    echo $RESERVATIONS
    echo "could not parse reservations"
    exit 1
fi

exit 0
