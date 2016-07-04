import {TypeGraph, Graph, Morphism} from './graph';

export const types = TypeGraph.assemble(
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
      radius: 20,
      icon: '<text transform="translate(0,12)" text-anchor="middle" style="font-size: 2em">F</text>'
    }
  ],
  [
    { name: 'on', signatures: [['elevator', 'floor']]},
    { name: 'call', signatures: [['request', 'request']]},
    { name: 'stop', signatures: [['request', 'request']]},
    { name: 'holds', signatures: [['floor', 'request']]},
    { name: 'next_up', signatures: [['floor', 'floor']]},
    { name: 'higher_than', signatures: [['floor', 'floor']]}
  ]
);

export const graphs = {
  callRequest_LHS: Graph.assemble(types,
    [
      { id: 'floor', type: 'floor', x: 0, y: 0 }
    ],
    []
  ),
  callRequest_RHS: Graph.assemble(types,
    [
      { id: 'floor', type: 'floor', x: 0, y: 0 },
      { id: 'r', type: 'request', x: 50, y: 0 }
    ],
    [
      { id: 0, type: 'holds', source: 'floor', target: 'r' },
    ]
  ),

  moveDown_LHS: Graph.assemble(types,
    [
      { id: 'el', type: 'elevator', x:350, y:74 },
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
  ),
  moveDown_RHS: Graph.assemble(types,
    [
      { id: 'el', type: 'elevator', x:350, y:74 },
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
  ),

  setDirectionDown_LHS: Graph.assemble(types,
    [
      { id: 'el', type: 'elevator', x:350, y:74 },
      { id: 'f2', type: 'floor', x:273, y:69 },
      { id: 'f1', type: 'floor', x:310, y:163 },
      { id: 'u', type: 'up', x:81, y:156 },
      { id: 'r', type: 'request', x:278, y:256 }
    ],
    [
      { id: 105, source: 'el', target: 'f2', type: 'on' },
      { id: 107, source: 'f2', target: 'f1', type: 'higher_than' },
      { id: 108, source: 'f1', target: 'r', type: 'holds' },
    ]
  ),
  setDirectionDown_RHS: Graph.assemble(types,
    [
      { id: 'el', type: 'elevator', x:350, y:74 },
      { id: 'f2', type: 'floor', x:273, y:69 },
      { id: 'f1', type: 'floor', x:310, y:163 },
      { id: 'd', type: 'down', x:81, y:156 },
      { id: 'r', type: 'request', x:278, y:256 }
    ],
    [
      { id: 105, source: 'el', target: 'f2', type: 'on' },
      { id: 107, source: 'f2', target: 'f1', type: 'higher_than' },
      { id: 108, source: 'f1', target: 'r', type: 'holds' },
    ]
  ),
  setDirectionDown_NAC_noHigherRequest: Graph.assemble(types,
    [
      { id: 'el', type: 'elevator', x:350, y:74 },
      { id: 'f2', type: 'floor', x:273, y:69 },
      { id: 'f1', type: 'floor', x:310, y:163 },
      { id: 'u', type: 'up', x:81, y:156 },
      { id: 'r', type: 'request', x:278, y:256 },
      { id: 'f3', type: 'floor', x:273, y:0 },
      { id: 'r2', type: 'request', x:278, y:0 }
    ],
    [
      { id: 105, source: 'el', target: 'f2', type: 'on' },
      { id: 107, source: 'f2', target: 'f1', type: 'higher_than' },
      { id: 108, source: 'f1', target: 'r', type: 'holds' },
      { id: 109, source: 'f3', target: 'f2', type: 'higher_than' },
      { id: 110, source: 'f3', target: 'r2', type: 'holds' },
    ]
  ),
};

export const morphisms = {
  callRequest: Morphism.assemble(graphs.callRequest_LHS, graphs.callRequest_RHS,
    [
      ['floor', 'floor'],
    ],
    []
  ),
  moveDown: Morphism.assemble(graphs.moveDown_LHS, graphs.moveDown_RHS,
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
  ),
  setDirectionDown: Morphism.assemble(graphs.setDirectionDown_LHS, graphs.setDirectionDown_RHS,
    [
      ['el', 'el'],
      ['f1', 'f1'],
      ['f2', 'f2'],
      ['r', 'r']
    ],
    [
      [105, 105],
      [107, 107],
      [108, 108]
    ]
  ),
  noHigherRequest: Morphism.assemble(graphs.setDirectionDown_LHS, graphs.setDirectionDown_NAC_noHigherRequest,
    [
      ['el', 'el'],
      ['f1', 'f1'],
      ['f2', 'f2'],
      ['u', 'u'],
      ['r', 'r']
    ],
    [
      [105, 105],
      [107, 107],
      [108, 108]
    ]
  )
};

function img(width: number, height: number, link: string): string {
  return `<image xlink:href="${link}" width="${width}" height="${height}" x="-${width/2}" y="-${height/2}"/>`;
}
