import * as fs from 'fs';
import { AsciiCanvas, Point, PointMath } from '../asciiCanvas';
import { flags } from '@oclif/command';
import CommandWithCatch from '../command-with-catch';
import { GET } from '../http';
import { currencyFormatter } from '../utils';

const STATIC_EXAMPLE = `$ qcs devices

Show only a device named Aspen4:

  $ qcs devices --name 'Aspen4'

Show all specs in JSON format:

  $ qcs devices --specs all --format json

Show only T1 and T2 specs:

  $ qcs devices --specs T1,T2

Output to a file:

  $ qcs devices --specs all --output specs.csv`;


type LatticeSpec = {
  name: string,
  device_id: number,
  qubits: Array<number>,
  edges: Array<string>,
  price_per_minute: number,
  spec_names_1q: Array<string>,
  spec_names_2q: Array<string>,
};

type DeviceSpec = {
  id: number,
  name: string,
  specs: any,
  num_qubits: number,
  lattice: LatticeSpec
};

type SpecsRow = Array<string>;
type SpecsHeaderRow = Array<string>
type SpecsTable = [SpecsHeaderRow, ...Array<SpecsRow>];

function largestLattice (latticesSpecs: Array<LatticeSpec>, deviceId: number): LatticeSpec {
  // Return the largest lattice (most qubits) with a given deviceId.
  let largest: LatticeSpec;

  latticesSpecs.forEach(lattice => {
    if (!largest && lattice.device_id == deviceId) {
      largest = lattice;
    } else {
      if (lattice.device_id == deviceId && largest.qubits.length < lattice.qubits.length) {
        largest = lattice;
      }
    }
  });

  return largest;
}

function normalizeDevices (devices, latticesSpecs: Array<LatticeSpec>): Array<DeviceSpec> {
  let result: Array<DeviceSpec> = latticesSpecs.map(lattice => {
    const device = devices[lattice.device_id];
    return {
      id: device.id,
      name: device.name,
      specs: device.specs,
      num_qubits: device.num_qubits,
      lattice: lattice
    }
  });

  return result;
}


function intersection (a1: Array<any>, a2: Array<any>) {
  // Return the intersection of arrays a1 and a2, preserving the order of a2
  return a2.filter(elt => a1.indexOf(elt) > -1);
}


function specsTable (label: string, specNames: Array<string>, specs: Object): SpecsTable {
  let dataRows: Array<SpecsRow> = [];

  if (specNames.length) {
    for (const [qubitOrPair, spec] of Object.entries(specs)) {
      dataRows.push([qubitOrPair, ...specNames.map(specName => new Intl.NumberFormat('en-us', {minimumFractionDigits: 6}).format(spec[specName]))]);
    }
  }
  return [[label, ...specNames], ...dataRows.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))];
}


function specsTables (specNames: Array<string>, device: DeviceSpec) {
  // Return the 1Q and 2Q specs for device that include specNames
  const specNames1q = intersection(specNames, device.lattice.spec_names_1q);
  const specNames2q = intersection(specNames, device.lattice.spec_names_2q);

  return [specsTable('Qubit', specNames1q, device.specs['1Q']),
          specsTable('Qubit Pair', specNames2q, device.specs['2Q'])]
}


function formatSpecsTable(specsTable: SpecsTable): string {
  let columnWidth = (i: number) => {
    let maxWidth: number = 0;
    specsTable.forEach(row => {
      let columnString = String(row[i]);
      if (columnString.length > maxWidth) {
        maxWidth = columnString.length;
      }
    })
    return maxWidth + 2;
  };
  let centerString = (s: string, width: number): string => {
    let delta = Math.floor((width - s.length) / 2) - 1;
    return s.padStart(width - delta).padEnd(width);
  }

  let widths = specsTable[0].map((_, i) => columnWidth(i));

  let output: string = '';
  // Format the header
  widths.map((width, i) => {
    output += centerString(specsTable[0][i], width);
  });
  output += '\n';

  widths.map(width => {
    output += centerString('='.padEnd(width - 2, '='), width);
  });
  output += '\n';

  // Format the rest
  specsTable.slice(1).forEach(row => {
    widths.map((width, i) => {
      output += row[i].toString().padStart(width);
    });
    output += '\n';
  });

  return output;
}


const baseQubitCoordinates = [
  [12, 0],
  [14, 2],
  [14, 4],
  [12, 6],
  [5, 6],
  [3, 4],
  [3, 2],
  [5, 0],
];


class DiagramQubit {
  name: String;
  octagonIndex: number;
  qubitIndex: number;
  dead: boolean = false;

  constructor(name: string) {
    let nameValue = parseInt(name);
    this.name = name;
    this.octagonIndex = Math.floor(nameValue / 10);
    this.qubitIndex = nameValue % 10;
  }

  position(): Point {
    const offset: Number = 15;
    return PointMath.add(baseQubitCoordinates[this.qubitIndex],
                         [this.octagonIndex * offset, 0]);
  }

  label(): string {
    if (this.dead) {
      return 'x';
    } else {
      return this.name;
    }
  }

  draw(canvas: AsciiCanvas) {
    canvas.putString(this.position(), this.label());
  }

  drawConnection(canvas: AsciiCanvas, q: DiagramQubit) {
    if (!(this.dead || q.dead)) {
      canvas.line(this.position(), q.position());
    }
  }
}

function latticeTopology(lattice: LatticeSpec): string {
  const c = new AsciiCanvas(200, 7);
  const isa = lattice.device_isa;

  lattice.edges.map(edge => {
    let [q1, q2] = edge.split(/-/).map(name => new DiagramQubit(name));
    q1.dead = isa['1Q'][q1.name]['dead'];
    q2.dead = isa['1Q'][q2.name]['dead'];
    q1.drawConnection(c, q2);
    q1.draw(c);
    q2.draw(c);
  });
  return c.toString();
}

export default class Devices extends CommandWithCatch {
  static description = 'View available QPU devices.';

  static examples = [STATIC_EXAMPLE];

  static flags = {
    output: flags.string({
      name: 'output',
      char: 'o',
      description: 'Path to save output',
      required: false,
    }),
    name: flags.string({
      char: 'n',
      description: 'Limit info to the named device',
      required: false,
    }),
    specs: flags.string({
      char: 's',
      description: 'Show specs. Use \'all\' to show all specs, or a comma-separated list to limit to certain specs',
      required: false,
    }),
    format: flags.string({
      name: 'format',
      char: 'f',
      required: false,
      description: 'Format of the output; if specified, one of \'json\' or \'csv\'',
    }),
    topology: flags.boolean({
      name: 'topology',
      char: 't',
      required: false,
      description: 'Include device topology in output',
    }),
    help: flags.help({ char: 'h' }),
  };

  async run() {
    const { flags } = this.parse(Devices);
    const latticesSpecs: {devices: Array<DeviceSpec>, lattices_specs: Array<LatticeSpec>} = await GET.latticesSpecs();
    let devices: Array<DeviceSpec> = normalizeDevices(latticesSpecs['devices'], latticesSpecs['lattices_specs']);
    let specs: Array<string> = [];

    if (flags.specs) {
      if (flags.specs === 'all') {
        specs = [
          "T1",
          "T2",
          "f1QRB",
          "f1QRB_std_err",
          "f1Q_simultaneous_RB",
          "f1Q_simultaneous_RB_std_err",
          "fRO",
          "Avg_T1",
          "Avg_T2",
          "Avg_f1QRB",
          "Avg_f1QRB_std_err",
          "Avg_f1Q_simultaneous_RB",
          "Avg_f1Q_simultaneous_RB_std_err",
          "Avg_fRO",
          "fCZ",
          "fCZ_std_err",
          "fXY",
          "fXY_std_err",
          "fBellState",
          "fCPHASE",
          "fActiveReset",
        ];
      } else {
        specs = flags.specs.split(/, */);
      }
    }

    if (flags.name) {
      devices = devices.filter(device => device.name === flags.name);
      if (devices.length == 0) {
        this.logErrorAndExit(`Unknown device name '${flags.name}'`);
        return;
      }
    }

    let outputString: string = '';

    if (flags.format === 'json') {
      let devicesJSON = devices.map(device => {
        const [specsTable1q, specsTable2q] = specsTables(specs, device);

        return {
          name: device.name,
          num_qubits: device.num_qubits,
          qubits: device.lattice.qubits,
          price_per_minute: device.lattice.price_per_minute,
          specs: {
            '1Q': specsTable1q,
            '2Q': specsTable2q
          }
        }
      });
      outputString += JSON.stringify(devicesJSON);
    } else if (flags.format === 'csv') {
      devices.forEach(device => {
        outputString += device.name + '\n';
        const tables = specsTables(specs, device);
        tables.forEach(table => {
          // Only show tables with data rows in addition to the header
          // rows
          if (table.length > 1) {
            table.forEach(tableRow => {
              outputString += tableRow.join(',') + '\n';
            });
          }
        });
      });
    } else {
      devices.forEach(device => {
        outputString += `DEVICE\nName: ${device.name}\n`;
        outputString += `  Number of qubits: ${device.lattice.qubits.length}\n`;
        outputString += `  Qubits: ${device.lattice.qubits.sort((a: number, b: number) => a - b).join(',')}\n`;
        outputString += `  Price (per min.): ${currencyFormatter.format(device.lattice.price_per_minute / 100)}\n`;

        if (flags.topology) {
          outputString += `  Topology for ${device.lattice.name}:\n\n`;
          outputString += latticeTopology(device.lattice) + '\n\n';
        }

        if (specs.length) {
          const [specsTable1q, specsTable2q] = specsTables(specs, device);
          outputString += '  Specs:\n';
          if (specsTable1q.length > 1) {
            outputString += formatSpecsTable(specsTable1q) + '\n';
          }
          if (specsTable2q.length > 1) {
            outputString += formatSpecsTable(specsTable2q) + '\n';
          }
        }
      });
    }

    if (flags.output) {
      fs.writeFileSync(flags.output, outputString);
    } else {
      console.log(outputString);
    }
  }
}
