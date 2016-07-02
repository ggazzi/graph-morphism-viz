import {Point, Vector} from './geometry';

type StringMap<V> = {[key:string]: V};

export class TypeGraph {
  nodes: StringMap<NodeType>;
  edges: StringMap<EdgeType>;

  /** Creates an empty type graph */
  constructor() {
    this.nodes = {};
  }

  /** Creates a type graph with the given node and edge types.
   *
   * The given stubs of edge types refer to node types by name. If
   * any of the referenced node types is undefined, an error will be thrown.
   */
  static assemble(nodeTypes: NodeType[], edgeTypes: EdgeTypeStub[]) {
    const types = new TypeGraph();
    types.nodes = assembleNodeTypes(nodeTypes);
    types.edges = assembleEdgeTypes(types.nodes, edgeTypes);
    return types;
  }
}

export interface NodeType {
  name: string;
  radius: number;
  icon?: string;
}

export class EdgeType {
  name: string;
  signatures: [NodeType, NodeType][];

  constructor(name: string, signatures: [NodeType, NodeType][]) {
    this.name = name;
    this.signatures = signatures;
  }

  allowsSignature(sourceType: NodeType, targetType: NodeType) {
    for (const signature of this.signatures) {
      const correctSource = signature[0] === sourceType;
      const correctTarget = signature[1] === targetType;

      if (correctSource && correctTarget) return true;
    }
    return false;
  }
}

export interface EdgeTypeStub {
  name: string;
  signatures: [string, string][];
}

export class Graph {
  types: TypeGraph;
  nodes: StringMap<Graph.Node>;
  edges: StringMap<Graph.Edge>;

  /** Creates an empty graph with the given types. */
  constructor(types: TypeGraph) {
    this.types = types;
    this.nodes = {};
    this.edges = {};
  }

  /** Creates a graph with the given types, nodes and edges.
   *
   * Nodes refer to their types by name. Edges refer to their
   * types, sources and targets by name. If any of the referenced entities
   * is undefined, an error will be thrown.
   *
   * If the source or target of some edge doesn't respect the typing,
   * an error will be thrown.
   */
  static assemble(types: TypeGraph, nodes: Graph.NodeStub[], edges: Graph.EdgeStub[]) : Graph {
    const graph = new Graph(types);
    graph.nodes = assembleNodes(types, nodes);
    graph.edges = assembleEdges(types, graph.nodes, edges);
    return graph;
  }
}

export namespace Graph {
  export class Node {
    id: string;
    type: NodeType;

    x: number;
    y: number;
    dragging: boolean;
    pinned: boolean;

    get point(): Point { return new Point(this.x, this.y); }

    /** Creates a node from the given stub, on the given context.
     *
     * If the type doesn't exist, throw an error.
     */
    constructor(types: TypeGraph, stub: NodeStub) {
      this.id = stub.id;
      this.type = types.nodes[stub.type];
      if (typeof this.type === 'undefined') {
        throw Error(`Graph::Node::constructor: unknown node type '${stub.type}' for node '${stub.id}'`);
      }

      [this.x, this.y] = [stub.x, stub.y];
      this.dragging = this.pinned = false;
    }

    get isFixed(): boolean { return this.dragging || this.pinned; }
    get fx(): number { return this.isFixed ? this.x : undefined; }
    get fy(): number { return this.isFixed ? this.y : undefined; }
  }

  export interface NodeStub {
    id: string;
    type: string;

    x: number;
    y: number;
  }

  export class Edge {
    id: number;
    type: EdgeType;

    source: Node;
    target: Node;

    get center(): Point {
      return new Point(
        (this.source.x + this.target.x)/2,
        (this.source.y + this.target.y)/2
      );
    }

    /** Displacement in [0,1] of the label along the direction of the edge.
     *
     * A displacement of 0 means the label is on the source, of 1 on the target.
     */
    labelDisp: number;
    labelSize: {width: number, height: number};

    get labelPos(): Point {
      const displacement = this.target.point
        .distanceFrom(this.source.point)
        .scaleBy(this.labelDisp);

      const displacementFromEdge = displacement.orthogonal
        .scaleBy(3/displacement.norm);

      const halfWidth = this.labelSize.width/2;
      const halfHeight = this.labelSize.height/2;

      if (displacement.dx * displacement.dy >= 0) {
        displacement.dx += halfWidth;
        displacement.dy -= halfHeight + 3;
      } else {
        displacement.dx += halfWidth;
        displacement.dy += halfHeight;
      }

      displacement.dy += halfHeight;

      return this.source.point.add(displacement)//.add(displacementFromEdge);
    }

    /** Creates an edge from the given stub, in the given context.
     *
     * If the source, target or type don't exist, throw an error.
     * If the source or target don't respect typing, throw an error.
     */
    constructor(types: TypeGraph, nodes: StringMap<Node>, stub: EdgeStub) {
      this.id = stub.id;
      this.labelDisp = 0.5;
      this.labelSize = {width: 0, height: 0};
      this.type = types.edges[stub.type];
      if (typeof this.type === 'undefined') {
        throw Error(`Graph::Node::constructor: unknown edge type '${stub.type}' for edge '${stub.id}'`);
      }

      this.source = nodes[stub.source];
      if (typeof this.source === 'undefined') {
        throw Error(`Graph::Node::constructor: unknown edge source '${stub.source}' for edge '${stub.id}'`);
      }

      this.target = nodes[stub.target];
      if (typeof this.target === 'undefined') {
        throw Error(`Graph::Node::constructor: unknown edge target '${stub.target}' for edge '${stub.id}'`);
      }

      if (!this.type.allowsSignature(this.source.type, this.target.type)) {
        throw Error(`Graph::Node::constructor: invalid types for source and target on edge '${stub.id}'`);
      }
    }
  }

  export interface EdgeStub {
    id: number;
    type: string;

    source: string;
    target: string;
  }
}

interface Label {
  displacement: Vector;
  width: number;
  height: number;
}

function assembleNodeTypes(nodeTypes: NodeType[]): StringMap<NodeType> {
  const types = {};

  for (const nodeType of nodeTypes) {
    types[nodeType.name] = nodeType;
  }

  return types;
}

function assembleEdgeTypes(nodeTypes: StringMap<NodeType>, stubs: EdgeTypeStub[]): StringMap<EdgeType> {
  const types = {};

  for (const stub of stubs) {
    const signatures = stub.signatures.map<[NodeType, NodeType]>(([src, tgt]) => {
      const srcType = nodeTypes[src];
      if (typeof srcType === 'undefined') {
        throw Error(`assembleEdgeTypes: unknown source node type '${src}' for edge type '${stub.name}'`);
      }

      const tgtType = nodeTypes[tgt];
      if (typeof tgtType === 'undefined') {
        throw Error(`assembleEdgeTypes: unknown target node type '${tgt}' for edge type '${stub.name}'`);
      }

      return [srcType, tgtType];
    })

    types[stub.name] = new EdgeType(stub.name, signatures);
  }

  return types;
}

function assembleNodes(types: TypeGraph, stubs: Graph.NodeStub[]): StringMap<Graph.Node> {
  const nodes = {};

  for (const stub of stubs) {
    nodes[stub.id] = new Graph.Node(types, stub);
  }

  return nodes;
}

function assembleEdges(types: TypeGraph, nodes: StringMap<Graph.Node>, stubs: Graph.EdgeStub[]): StringMap<Graph.Edge> {
  const edges = {};

  for (const stub of stubs) {
    edges[stub.id] = new Graph.Edge(types, nodes, stub);
  }

  return edges;
}
