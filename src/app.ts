import {Graph, TypeGraph, Morphism} from './graph';
import {GraphLayouter} from './graph-layout';

import * as GraphView from './graph-view';
import * as Form from './forms';

function controlConfig(config: GraphLayouter.Configuration) {
  const configForm = d3.select('form[name="config"]');

  Form.addCheckbox(configForm, config, 'layouterOn', 'Automatic Layout');

  Form.addCheckbox(configForm, config, 'autoCenter', 'Automatic Centering');

  Form.addSlider(configForm, config, 'gravityStrength', 'Gravity',
    d3.format('1.0e'),
    d3.scaleLog()
      .base(10)
      .domain([1e-5, 1])
      .range([0, 1])
  );

  Form.addSlider(configForm, config, 'nodeRepulsionStrength', 'Node Repulsion',
    d3.format('+04'),
    d3.scaleLinear()
      .domain([-0, -200])
      .range([0, 1])
  );

  Form.addSlider(configForm, config, 'edgeLength', 'Edge Length',
    d3.format('03'),
    d3.scaleLinear()
      .domain([0, 200])
      .range([0, 1])
  )

  Form.addSlider(configForm, config, 'edgeStrength', 'Edge Rigidity',
    d3.format('1.2g'),
    d3.scaleLinear()
      .domain([0, 1])
      .range([0, 1])
  );

  Form.addSlider(configForm, config, 'mappingConsistency', 'Mapping Consistency',
    d3.format('1.2g'),
    d3.scaleLinear()
      .domain([0, 1])
      .range([0, 1])
  );
}

(<any>window).app = {
  run() {
    const svgCanvas = d3.select('#canvas');

    const config = new GraphLayouter.Configuration();
    controlConfig(config);

    const arrowhead = new GraphView.Arrowhead(8, 8, <any>svgCanvas.append('defs'));

    const layouter1 = GraphView.showGraph(d3.select('#graph1'), graph1, morphism.mappingFromDomain, arrowhead, config, onDrag);
    const layouter2 = GraphView.showGraph(d3.select('#graph2'), graph2, morphism.mappingFromCodomain, arrowhead, config, onDrag);

    function onDrag() {
      layouter1.restart();
      layouter2.restart();
    }
  }
}

function showGraph(container: d3.Selection<Element, {}, Element, {}>, config: GraphLayouter.Configuration, graph: Graph) {

}

const types = TypeGraph.assemble(
  [
    { name: 'up',
      radius: 20,
      icon: img(40, 40, 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Human-go-up.svg')
    },
    { name: 'down',
      radius: 20,
      icon: img(40, 40, 'https://upload.wikimedia.org/wikipedia/commons/0/08/Human-go-down.svg')
    },
    { name: 'request',
      radius: 20,
      icon: img(40, 40, 'https://upload.wikimedia.org/wikipedia/commons/2/29/Fxemoji_u2757.svg')
    },
    { name: 'elevator',
      radius: 20,
      icon: img(40, 40, 'http://vignette3.wikia.nocookie.net/elevation/images/6/65/AIGA_Elevator.svg')
    },
    {
      name: 'floor',
      radius: 20
    }
  ],
  [
    { name: 'on', signatures: [['elevator', 'floor']]},
    { name: 'call', signatures: []},
    { name: 'stop', signatures: []},
    { name: 'holds', signatures: [['floor', 'request']]},
    { name: 'next_up', signatures: [['floor', 'floor']]},
    { name: 'higher_than', signatures: [['floor', 'floor']]}
  ]
);

const graph1 = Graph.assemble(types,
  [
    { id: 'el', type: 'elevator', x:94, y:74 },
    { id: 'f2', type: 'floor', x:273, y:69 },
    { id: 'd', type: 'down', x:81, y:156 },
    { id: 'f1', type: 'floor', x:310, y:163 },
    { id: 'f0', type: 'floor', x:90, y:249 },
    { id: 'r', type: 'request', x:278, y:256 }
  ],
  [
    { id: 105, source: 'el', target: 'f2', type: 'on' },
    { id: 106, source: 'f1', target: 'f2', type: 'next_up' },
    { id: 107, source: 'f2', target: 'f0', type: 'higher_than' },
    { id: 108, source: 'f0', target: 'r', type: 'holds' },
  ]
)

const graph2 = Graph.assemble(types,
  [
    { id: 'el', type: 'elevator', x:94, y:74 },
    { id: 'f2', type: 'floor', x:273, y:69 },
    { id: 'd', type: 'down', x:81, y:156 },
    { id: 'f1', type: 'floor', x:310, y:163 },
    { id: 'f0', type: 'floor', x:90, y:249 },
    { id: 'r', type: 'request', x:278, y:256 }
  ],
  [
    { id: 105, source: 'el', target: 'f1', type: 'on' },
    { id: 106, source: 'f1', target: 'f2', type: 'next_up' },
    { id: 107, source: 'f2', target: 'f0', type: 'higher_than' },
    { id: 108, source: 'f0', target: 'r', type: 'holds' },
  ]
)

const morphism = Morphism.assemble(graph1, graph2,
  [
    ['el', 'el'],
    ['f0', 'f0'],
    ['f1', 'f1'],
    ['f2', 'f2'],
    ['d', 'd'],
    ['r', 'r']
  ],
  [
    [106, 106],
    [107, 107],
    [108, 108]
  ]
);

function img(width: number, height: number, link: string): string {
  return `<image xlink:href="${link}" width="${width}" height="${height}" x="-${width/2}" y="-${height/2}"/>`;
}
