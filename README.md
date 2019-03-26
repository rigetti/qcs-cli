# qcs-cli

The `qcs-cli` is the Rigetti Quantum Cloud Services Command Line Interface (CLI). It is used for:

- Reserving, viewing, or cancelling your reservations on Rigetti Quantum Computers,
- Listing available Quantum Computers (devices) and various sublattices within them.
- Viewing, creating and deleting your Quantum Machine Images (QMIs).

```
$ qcs

The Rigetti QCS Command Line Interface (CLI)

USAGE
  $ qcs [COMMAND]

COMMANDS
  cancel        Cancel reservations in the compute schedule.
  devices       View available QPU devices.
  help          display help for qcs
  lattices      View available lattices.
  qmis          View, create, and delete QMIs.
  reservations  View the compute block schedule.
  reserve       Book reservations in the compute schedule.
```

Every QCS User's QMI comes preinstalled with the `qcs-cli`. It may also be
used locally from your laptop. Installation and setup instructions may be found below.

## Installation & Setup

### Pre-reqs: Install `node` & `npm`

The qcs-cli is written in typescript, which requires node and the node package manager npm to be
installed. Install both from this [link](https://nodejs.org/en/). If node is already on your
machine, make sure you have version > `8.0.0`.

### Install qcs-cli

#### Install via `npm`

Run the command npm `install -g qcs-cli`.

#### Install via the source from github

Clone this repository to your machine via the following command:

```
# Clone the repo and cd into it
git clone git@github.com:rigetti/qcs-cli.git
cd qcs-cli

# Install qcs-cli
npm install

# Link the qcs command so you can type qcs
npm link
```

### Setup

The qcs-cli is ready to use to view available devices and lattices. To book and view reservations
with the qcs-cli, and to manage quantum machine images, however, you will need to authenticate as a
user. To do this, a `.qcs_config` file with the following contents must be placed in the home folder
(`~`) of your machine. The contents of `~/.qcs_config` should be the following:

```
[Rigetti Forest]
url = https://forest-server.qcs.rigetti.com
user_id = <your-user-token>
```

Your `user_id` can be found in the `.qcs_config` file in your QMI, if you have already registered
for QCS. If you haven't signed up for QCS, you can request access
[here](https://qcs.rigetti.com/request-access).
