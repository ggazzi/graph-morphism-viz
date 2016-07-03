import {Model} from './model';
import {Graph} from './graph';
import {GraphLayouter} from './graph-layout';

export function showGraph(
      svgElement: d3.Selection<Element, {}, Element, any>,
      graph: Graph,
      arrowhead: Arrowhead,
      config: GraphLayouter.Configuration
    ) {

  const width  = +svgElement.attr('width'),
        height = +svgElement.attr('height');

  const layouter = new GraphLayouter(config, graph, width, height);

  const edgesView = new EdgesView(svgElement, d3.values(graph.edges), arrowhead);
  const nodesView = new NodesView(svgElement, d3.values(graph.nodes), layouter, updateView);

  layouter.simulation.on('tick', updateView);

  function updateView() {
    nodesView.refresh();
    edgesView.refresh();
  }
}

type D3Selection<Datum> = d3.Selection<Element, Datum, Element, {}>;

class NodesView {
  private nodesGroup: D3Selection<Graph.Node>

  /** Create an svg group showing the given nodes.
   *
   * Each node will be represented by an element 'g.node', which
   * contains the node's icon and outline.
   */
  constructor(container: D3Selection<{}>, nodes: Graph.Node[], layouter: GraphLayouter, onDrag: () => void) {

    const nodesGroup = this.nodesGroup = container.append('g')
        .attr('class', 'nodes')
      .selectAll('.node')
        .data(nodes)
      .enter().append('g')
        .attr('class', 'node')
        .call(dragNodes(layouter, onDrag))
        .on('dblclick', node => {
          node.pinned = !node.pinned
        });

    nodesGroup.each(function drawNode(node) {
      d3.select(this)
          .html(node.type.icon || `<circle r="${node.type.radius}"/>`)
        .append('circle')
          .attr('class', 'outline')
          .attr('r', node.type.radius);
    });
  }

  /** Update the visualization of the nodes. */
  refresh() {
    this.nodesGroup.attr('transform', node => `translate(${node.x}, ${node.y})`);
  }
}

class EdgesView {
  private edgesGroup: D3Selection<Graph.Edge>
  private arrowhead: Arrowhead

  /** Create an svg group showing the givene dges.
   *
   * Each edge will be represented by an element 'g.edge', which contains
   * the edge's path and label.
   */
  constructor(container: D3Selection<{}>, edges: Graph.Edge[], arrowhead: Arrowhead) {
    this.arrowhead = arrowhead;

    const edgesGroup = this.edgesGroup = container.append('g')
        .attr('class', 'edges')
      .selectAll('.edge')
        .data(edges)
      .enter().append('g')
        .attr('class', 'edge');

    edgesGroup.append('path')
        .attr('class', '')
        .attr('marker-end', `url('#${arrowhead.markerId}')`);

    edgesGroup.append('text')
        .text(edge => edge.type.name);
  }

  refresh() {
    this.edgesGroup.select('path').attr('d', edge => this.calculatePath(edge));

    this.edgesGroup.select('text')
        .each(function(edge) {
          // We must first update from screen, in order to reposition the label appropriately
          EdgesView.updateLabelFromScreen(<any>this, edge);
        })
        .attr('transform', edge => this.calculateLabelTransform(edge));
  }

  /** Calculates the path of the edge.
   *
   * Must reduce the path length compensating for:
   *  - node radius
   *  - node border
   *  - arrowhead length
   */
  private calculatePath(edge: Graph.Edge) {
    const delta = edge.target.point.distanceFrom(edge.source.point);
    const norm = delta.scaleBy(1/delta.norm);

    const sourcePadding = edge.source.type.radius + 3, // border width
          targetPadding = edge.target.type.radius + .6 * this.arrowhead.edgePadding + 3; // border width

    const source = edge.source.point.add(norm.scaleBy(sourcePadding));
    const target = edge.target.point.sub(norm.scaleBy(targetPadding))

    return `M${source.x},${source.y} L${target.x},${target.y}`;
  }

  private calculateLabelTransform(edge: Graph.Edge) {
    const location = edge.labelPos;
    return `translate(${location.x},${location.y})`;
  }

  private static updateLabelFromScreen(text: SVGLocatable, edge: Graph.Edge) {
    const bbox = text.getBBox();
    edge.labelSize.width = bbox.width;
    edge.labelSize.height = bbox.height;
  }
}

function dragNodes(layouter: GraphLayouter, dragCallback: () => void) : d3.DragBehavior<Element, Graph.Node> {
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

export class Arrowhead {
  private marker: d3.Selection<SVGMarkerElement, {}, Element, {}>;
  private size: {width: number, height: number};

  get width(): number { return this.size.width; }
  get height(): number { return this.size.height; }
  get markerId(): string { return this.marker.attr('id'); }

  get edgePadding(): number { return this.size.width * (1 - MARKER_REFX_MULT)}

  constructor(width: number, height: number, defs: d3.Selection<SVGDefsElement, {}, Element, {}>) {
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
