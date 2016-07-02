import {Model} from './model';
import {Point, Vector} from './geometry';
import {Graph, TypeGraph} from './graph';

import {GraphLayouter} from './graph-layout';
import * as Form from './forms';


function showGraph(container: d3.Selection<SVGElement, {}, Element, any>, arrowhead: Arrowhead, config: Model, graph: Graph) {
  const width  = +container.attr('width'),
        height = +container.attr('height');
  const layouter = new GraphLayouter(config, graph, width, height);

  const edgeElems = makeEdgeElems();
  const nodeElems = makeNodeElems(layouter);

  layouter.simulation.on('tick', updateView);

  function makeNodeElems(layouter: GraphLayouter) : d3.Selection<Element, Graph.Node, Element, {}> {
    const nodeElems = container.append('g')
        .attr('class', 'nodes')
      .selectAll('.node')
        .data(d3.values(graph.nodes))
      .enter().append('g')
        .attr('class', 'node')
        .call(dragNodes(config, layouter, updateView))
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
        .data(d3.values(graph.edges))
      .enter().append('g')
        .attr('class', 'edge');

    edgeElems.append('path')
        .attr('class', '')
        .attr('marker-end', `url('#${arrowhead.markerId}')`);

    edgeElems.append('text')
        .text(edge => edge.type.name);

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
  edgeElems.select('path').attr('d', edge => {
    const delta = edge.target.point.distanceFrom(edge.source.point);
    const norm = delta.scaleBy(1/delta.norm);

    const sourcePadding = edge.source.type.radius + 3, // border width
          targetPadding = edge.target.type.radius + .6 * arrowhead.edgePadding + 3; // border width

    const source = edge.source.point.add(norm.scaleBy(sourcePadding));
    const target = edge.target.point.sub(norm.scaleBy(targetPadding));

    return `M${source.x},${source.y} L${target.x},${target.y}`;
  });

  edgeElems.select('text')
      .each(function (edge) {
        const text: SVGLocatable = <any>this;
        const bbox = text.getBBox();
        edge.labelSize.width = bbox.width;
        edge.labelSize.height = bbox.height;
      })
      .attr('transform', edge => {
        const location = edge.labelPos;
        return `translate(${location.x},${location.y})`;
      });
}

function dragNodes(config: Model, layouter: GraphLayouter, dragCallback) : d3.DragBehavior<Element, Graph.Node> {
  return d3.drag<Element, Graph.Node>()
    .on('start', node => {
      if (!dragEvent().active) layouter.restart().simulation.alphaTarget(0.3);
      node.dragging = true;
    })
    .on('drag', node => {
      node.x = dragEvent().x;
      node.y = dragEvent().y;
      dragCallback();
    })
    .on('end', node => {
      if (!dragEvent().active) layouter.simulation.alphaTarget(0);
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

(<any>window).app = {
  run() {
    const svgCanvas: d3.Selection<SVGElement, {}, SVGElement, {}> = <any>d3.select('#canvas');
    const defs: d3.Selection<SVGDefsElement, {}, SVGElement, {}> = <any>svgCanvas.append('defs');

    const arrowhead = new Arrowhead(8, 8, defs);
    const config = new GraphLayouter.Configuration();
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
