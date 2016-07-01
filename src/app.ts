import {Model} from './model';
import {Graph, TypeGraph} from './graph';
import * as Form from './forms';

function makeLayoutConfig() : Model {
  const config = new Model({
    gravityStrength: 1e-2,
    nodeRepulsionStrength: -120,
    edgeLength: 100,

    layouterOn: true
  });

  return config;
}

function createSimulation(config: Model, graph: Graph, width: number, height: number) : d3.Simulation<Graph.Node> {
  const simulation = d3.forceSimulation<Graph.Node>(valuesOf(graph.nodes));

  const gravityX = d3.forceX<Graph.Node>(width/2).strength(config.get<number>('gravityStrength'));
  const gravityY = d3.forceY<Graph.Node>(height/2).strength(config.get<number>('gravityStrength'));

  config.onChange<number>('gravityStrength.sim', strength => {
    gravityX.strength(strength);
    gravityY.strength(strength);
    restartSim();
  });

  const nodeRepulsion = d3.forceManyBody<Graph.Node>()
    .strength(config.get<number>('nodeRepulsionStrength'));

  config.onChange<number>('nodeRepulsionStrength.sim', strength => {
    nodeRepulsion.strength(strength);
    restartSim();
  })

  const edgeAttraction = d3.forceLink(valuesOf(graph.edges))
    .distance(edge => config.get<number>('edgeLength') + edge.source.type.radius + edge.target.type.radius);

  config.onChange<number>('edgeLength.sim', length => {
    edgeAttraction.distance(edge => length + edge.source.type.radius + edge.target.type.radius);
    restartSim();
  })

  config.onChange<boolean>('layouterOn.sim', isActive => {
    if (isActive) {
      simulation.alpha(0.2).restart();
    } else {
      simulation.stop();
    }
  })

  simulation
    .force('gravityX', <any>gravityX)
    .force('gravityY', <any>gravityY)
    .force('nodeRepulsion', <any>nodeRepulsion)
    .force('edgeAttraction', edgeAttraction);

  return simulation;

  function restartSim() {
    if (config.get<boolean>('layouterOn')) {
      simulation.alpha(0.2).restart();
    }
  }
}

function showGraph(container: d3.Selection<SVGElement, {}, Element, any>, arrowhead: Arrowhead, config: Model, graph: Graph) {
  const width  = +container.attr('width'),
        height = +container.attr('height');
  const simulation = createSimulation(config, graph, width, height);

  const edgeElems = makeEdgeElems();
  const nodeElems = makeNodeElems(simulation);

  simulation.nodes(valuesOf(graph.nodes))
    .force('collision',
      d3.forceCollide<Graph.Node>(n => n.type.radius))
    .force('center',
      d3.forceCenter(width/2, height/2));

  simulation.on('tick', updateView)

  function makeNodeElems(simulation: d3.Simulation<Graph.Node>) : d3.Selection<Element, Graph.Node, Element, {}> {
    const nodeElems = container.append('g')
        .attr('class', 'nodes')
      .selectAll('.node')
        .data(valuesOf(graph.nodes))
      .enter().append('g')
        .attr('class', 'node')
        .call(dragNodes(config, simulation, updateView))
        .on('dblclick', node => {
          node.pinned = !node.pinned
        });

    nodeElems.each(drawNode);

    return nodeElems;
  }

  function updateView() {
    updateNodes(nodeElems);
    updateEdges(edgeElems, arrowhead);
  }

  function makeEdgeElems() : d3.Selection<Element, Graph.Edge, Element, {}> {
    const edgeElems = container.append('g')
        .attr('class', 'edges')
      .selectAll('.edge')
        .data(valuesOf(graph.edges))
      .enter().append('path')
        .attr('class', 'edge')
        .attr('marker-end', `url('#${arrowhead.markerId}')`);

    return edgeElems;
  }
}

function drawNode(node: Graph.Node) {
  d3.select(this)
      .html(node.type.icon || `<circle r="${node.type.radius}"/>`)
    .append('circle')
      .attr('class', 'outline')
      .attr('r', node.type.radius);
}

function updateNodes(nodeElems: d3.Selection<Element, Graph.Node, Element, {}>) {
  nodeElems.attr('transform', node => `translate(${node.x}, ${node.y})`);
}

function updateEdges(edgeElems: d3.Selection<Element, Graph.Edge, Element, {}>, arrowhead: Arrowhead) {
  edgeElems.attr('d', d => {
    const deltaX = d.target.x - d.source.x,
          deltaY = d.target.y - d.source.y,
          dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const normX = deltaX / dist,
          normY = deltaY / dist;

    const sourcePadding = d.source.type.radius + 3, // border width
          targetPadding = d.target.type.radius + .6 * arrowhead.edgePadding + 3; // border width

    const sourceX = d.source.x + (sourcePadding * normX),
          sourceY = d.source.y + (sourcePadding * normY),
          targetX = d.target.x - (targetPadding * normX),
          targetY = d.target.y - (targetPadding * normY);

    return `M${sourceX},${sourceY} L${targetX},${targetY}`;
  });
}


function dragNodes(config: Model, simulation: d3.Simulation<any>, dragCallback) : d3.DragBehavior<Element, Graph.Node> {
  return d3.drag<Element, Graph.Node>()
    .on('start', node => {
      if (!dragEvent().active && config.get<boolean>('layouterOn')) {
        simulation.alphaTarget(0.3).restart();
      }
      node.dragging = true;
    })
    .on('drag', node => {
      node.x = dragEvent().x;
      node.y = dragEvent().y;
      dragCallback();
    })
    .on('end', node => {
      if (!dragEvent().active) simulation.alphaTarget(0);
      node.dragging = false;
    });
}

function dragEvent<GElement extends Element, Datum>() : d3.D3DragEvent<GElement, Datum> {
  return <any>d3.event;
}

const MARKER_REFX_MULT = 0.6;

class Arrowhead {
  private marker: d3.Selection<SVGMarkerElement, {}, Element, {}>;
  private size: {width: number, height: number};

  get width(): number { return this.size.width; }
  get height(): number { return this.size.height; }
  get markerId(): string { return this.marker.attr('id'); }

  get edgePadding(): number { return this.size.width * (1 - MARKER_REFX_MULT)}

  constructor(width, height, defs: d3.Selection<SVGDefsElement, {}, Element, {}>) {
    this.size = {width, height};

    this.marker = <any>defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', MARKER_REFX_MULT * 10)
      .attr('markerWidth', width)
      .attr('markerHeight', height)
      .attr('orient', 'auto');

    this.marker.append('svg:path')
      .attr('d', `M0,${-height/2} L${width},0 L0,${height/2}`)
      .attr('stroke-width', 0);
  }
}

function controlConfig<T>(config: Model) {
  const configForm = d3.select('form[name="config"]');

  Form.addCheckbox(configForm, config, 'layouterOn', 'Automatic Layout');

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
}

function valuesOf<T>(object: {[key:string]:T}) : T[] {
  const result: T[] = [];

  for (const key in object) {
    result.push(object[key]);
  }

  return result;
}

(<any>window).app = {
  run() {
    const svgCanvas: d3.Selection<SVGElement, {}, SVGElement, {}> = <any>d3.select('#canvas');
    const defs: d3.Selection<SVGDefsElement, {}, SVGElement, {}> = <any>svgCanvas.append('defs');

    const arrowhead = new Arrowhead(8, 8, defs);
    const config = makeLayoutConfig();
    controlConfig(config);

    showGraph(svgCanvas, arrowhead, config, graph);
  }
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

const graph = Graph.assemble(types,
  [
    { id: 'el', type: 'elevator', x:94, y:74 },
    { id: 'f1', type: 'floor', x:273, y:69 },
    { id: 'd', type: 'down', x:81, y:156 },
    { id: 'f2', type: 'floor', x:310, y:163 },
    { id: 'f3', type: 'floor', x:90, y:249 },
    { id: 'r', type: 'request', x:278, y:256 }
  ],
  [
    { id: 105, source: 'el', target: 'f1', type: 'on' },
    { id: 106, source: 'f2', target: 'f1', type: 'next_up' },
    { id: 107, source: 'f1', target: 'f3', type: 'higher_than' },
    { id: 108, source: 'f3', target: 'r', type: 'holds' },
  ]
)

function img(width, height, link): string {
  return `<image xlink:href="${link}" width="${width}" height="${height}" x="-${width/2}" y="-${height/2}"/>`;
}
