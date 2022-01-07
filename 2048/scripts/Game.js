const Scene = require('Scene');
const Blocks = require('Blocks');
const Random = require('Random');
const Reactive = require('Reactive');
const Diagnostics = require('Diagnostics');

(async function () { 

    const placer = await Scene.root.findFirst('Placer');
    const floor = await Scene.root.findFirst('Floor');

    let arrayBox = new Array(4).fill(null).map(row => new Array(4).fill(null));
    let arrayValue = new Array(4).fill(null).map(row => new Array(4).fill(null));
    StartGame();

    async function StartGame(){
        let boxCount = 0;
        while(boxCount < 2){

            let x = Math.floor(Math.random() * 4);
            let y = Math.floor(Math.random() * 4);

            if(arrayBox[x][y] == null){
                arrayBox[x][y] = BoxInstantiate(x,y);
                arrayValue[x][y] = 2;
                boxCount++;
            }
        }
    }

    async function BoxInstantiate(x, y){
        let box = await Blocks.instantiate('BoxPrefab', {"name": "Box"+x+y});
        let position = GetPosition(x,y);
        placer.addChild(box);
        box.transform.x = position.x;
        box.transform.z = position.y;
        return box;
    }

    function SetBoxText(block, text){
        block.inputs.setString('Text', text);
    }

    function SetBoxColor(block, color){
        block.inputs.setColor('BoxColor', color);
    }

    function GetPosition(gridX, gridY){
        let position = {
            x: gridX * 0.125 - 0.185,
            y: gridY * 0.125 - 0.185
        };
        return position;
    }

  })();