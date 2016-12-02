module Main exposing (..)

import Draggable exposing (Delta)
import Draggable.Events exposing (onDragBy, onMouseDownKeyed, onMouseUp)
import Html exposing (Html)
import Json.Decode as Json exposing (field)
import Maybe.Extra exposing (maybeToList)
import Mouse exposing (Position)
import Svg exposing (Svg)
import Svg.Attributes as Attr
import Svg.Keyed
import Svg.Lazy as Svg
import VirtualDom


main : Program Never Model Msg
main =
    Html.program
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }



-- MODEL


type alias Model =
    { mouse : Position
    , nodes : NodeGroup
    , drag : Draggable.State
    }


model : Model
model =
    { mouse = { x = 0, y = 0 }
    , nodes = emptyGroup
    , drag = Draggable.init
    }


type alias Node =
    { id : Id
    , position : Position
    }


type alias Id =
    String


moveBy : Delta -> Position -> Position
moveBy ( dx, dy ) ({ x, y } as position) =
    { position
        | x = x + dx
        , y = y + dy
    }


dragNodeBy : Delta -> Node -> Node
dragNodeBy delta node =
    { node
        | position = moveBy delta node.position
    }


type alias NodeGroup =
    { uid : Int
    , movingNode : Maybe Node
    , idleNodes : List Node
    }


emptyGroup : NodeGroup
emptyGroup =
    NodeGroup 0 Nothing []


addNodeAt : Position -> NodeGroup -> NodeGroup
addNodeAt position ({ uid, idleNodes } as group) =
    { group
        | idleNodes = (Node (toString uid) position) :: idleNodes
        , uid = uid + 1
    }


allNodes : NodeGroup -> List Node
allNodes { movingNode, idleNodes } =
    maybeToList movingNode ++ idleNodes


startDragging : Id -> NodeGroup -> NodeGroup
startDragging id ({ idleNodes, movingNode } as group) =
    let
        ( targetAsList, others ) =
            List.partition (\node -> node.id == id) idleNodes
    in
        { group
            | idleNodes = others
            , movingNode = List.head targetAsList
        }


stopDragging : NodeGroup -> NodeGroup
stopDragging group =
    { group
        | idleNodes = allNodes group
        , movingNode = Nothing
    }


dragActiveBy : Delta -> NodeGroup -> NodeGroup
dragActiveBy delta ({ movingNode } as group) =
    { group
        | movingNode = Maybe.map (dragNodeBy delta) movingNode
    }



-- UPDATE


type Msg
    = AddNode Position
    | DragMsg Draggable.Msg
    | DragBy Delta
    | StartDragging String
    | StopDragging


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        AddNode position ->
            ( { model | nodes = addNodeAt position model.nodes }
            , Cmd.none
            )

        DragBy delta ->
            ( { model | nodes = dragActiveBy delta model.nodes }
            , Cmd.none
            )

        StartDragging id ->
            ( { model | nodes = startDragging id model.nodes }
            , Cmd.none
            )

        StopDragging ->
            ( { model | nodes = stopDragging model.nodes }
            , Cmd.none
            )

        DragMsg dragMsg ->
            Draggable.update dragConfig dragMsg model


dragConfig : Draggable.Config Msg
dragConfig =
    Draggable.customConfig
        [ onDragBy DragBy
        , onMouseDownKeyed StartDragging
        , onMouseUp StopDragging
        ]



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions { drag } =
    Draggable.subscriptions DragMsg drag



-- VIEW


view : Model -> Html Msg
view model =
    Svg.svg
        [ Attr.width "100%"
        , Attr.height "100%"
        ]
        [ background
        , nodesView model.nodes
        ]


nodesView : NodeGroup -> Svg Msg
nodesView nodeGroup =
    nodeGroup
        |> allNodes
        |> List.reverse
        |> List.map nodeKeyedView
        |> Svg.Keyed.node "g" []


nodeKeyedView : Node -> ( String, Svg Msg )
nodeKeyedView node =
    ( node.id, Svg.lazy nodeView node )


nodeView : Node -> Svg Msg
nodeView { id, position } =
    Svg.rect
        [ Attr.width "2em"
        , Attr.height "2em"
        , Attr.x (toString position.x)
        , Attr.y (toString position.y)
        , Attr.fill "lightblue"
        , Attr.stroke "black"
        , Attr.cursor "move"
        , Draggable.mouseTrigger id DragMsg
        ]
        []


background : Svg Msg
background =
    Svg.rect
        [ Attr.x "0"
        , Attr.y "0"
        , Attr.width "100%"
        , Attr.height "100%"
        , Attr.fill "#eee"
        , VirtualDom.on "click" decodeClick
        ]
        []


decodeClick : Json.Decoder Msg
decodeClick =
    Json.map AddNode <|
        Json.map2 Position
            (field "clientX" Json.int)
            (field "clientY" Json.int)



-- INIT


init : ( Model, Cmd Msg )
init =
    ( model, Cmd.none )
