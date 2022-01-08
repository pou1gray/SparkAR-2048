const Scene = require('Scene');
const Animation = require('Animation');
const Blocks = require('Blocks');
const TouchGestures = require('TouchGestures');
const Random = require('Random');
const Reactive = require('Reactive');
const Diagnostics = require('Diagnostics');
const { off } = require('process');
const { DEFAULT_ENCODING } = require('crypto');

(async function () { 

    const placer = await Scene.root.findFirst('Placer');
    const floor = await Scene.root.findFirst('Floor');

    let arrayBox = new Array(4).fill(null).map(row => new Array(4).fill(null));
    let arrayValue = new Array(4).fill(null).map(row => new Array(4).fill(null));

    StartGame();

    TouchGestures.onTap().subscribe( () =>{
        Move(0);
    });

    TouchGestures.onLongPress().subscribe( () =>{
        Diagnostics.log(arrayValue);
        BoxInstantiate(3, 3, 2);
    });

    async function StartGame(){
        let boxCount = 0;
        while(boxCount < 2){

            let x = Math.floor(Math.random() * 4);
            let y = Math.floor(Math.random() * 4);

            if(arrayBox[x][y] == null){
                BoxInstantiate(x, y, 2);
                boxCount++;
            }
        }
    }

    async function BoxInstantiate(x, y, value){
        if(arrayBox[x][y] == null){
            let box = await Blocks.instantiate('BoxPrefab', {"name": "Box"+x+y});
            let position = GetPosition(x,y);
            placer.addChild(box);

            box.transform.x = position.x;
            box.transform.z = position.y;

            arrayBox[x][y] = box;
            arrayValue[x][y] = value;

            SetBoxText(box, value.toString());
            return box;
        }else{
            Diagnostics.log('Place to instantiate is not free');
            return null;
        }
    }

    function Move(direction){
        if(direction == 0){
            for(let x = 0; x < 4; x++){
                for(let y = 1; y < 4; y++){
                    if(arrayBox[x][y] != null){
                        let offset = 0;
                        let merge = false;
                        for(let d = 1; d <= y; d++){
                            if(arrayBox[x][y-d] == null){
                                offset++;
                            }else if (arrayValue[x][y] == arrayValue[x][y-d]){
                                merge = true;
                                
                                AnimateMerge(arrayBox[x][y], Reactive.point2d(x, y-d));
                                
                                arrayValue[x][y-d] += arrayValue[x][y];
                                arrayValue[x][y] = null;

                                arrayBox[x][y] = null;
                                Diagnostics.log("Merge to " + x + (y - d));
                                break;
                            }
                        }
                        if(merge) continue;
                        if(offset > 0){
                            //let moveTo = GetPosition(x, y-offset);
                            let tempBox = arrayBox[x][y];
                            let tempValue = arrayValue[x][y];

                            arrayBox[x][y] = null;
                            arrayBox[x][y-offset] = tempBox;

                            arrayValue[x][y] = null;
                            arrayValue[x][y-offset] = tempValue;

                            AnimateMove(tempBox, Reactive.point2d(x, y-offset));

                            Diagnostics.log('Move '+ x + y +' to ' + x + (y - offset));
                            Diagnostics.log(arrayValue);
                        }else Diagnostics.log('Cant move ' + x + y + 'to' + x + (y - offset));
                    }
                }
            }
        }
    }

    async function AnimateMerge(from, to){
        let toPosition = GetPosition(to.x.pinLastValue(),to.y.pinLastValue());

        let animationDriver = Animation.timeDriver({
            durationMilliseconds: 500,
            loopCount: 1,
            mirror: false
        });

        let animationSamplerX = Animation.samplers.linear((await from).transform.x.pinLastValue(), toPosition.x);
        let animationSamplerZ = Animation.samplers.linear((await from).transform.z.pinLastValue(), toPosition.y);

        let animationX = Animation.animate(animationDriver, animationSamplerX);
        let animationZ = Animation.animate(animationDriver, animationSamplerZ);

        (await from).transform.x = animationX;
        (await from).transform.z = animationZ;

        animationDriver.onCompleted().subscribe( async () =>{
            Scene.destroy((await from));
            SetBoxText((await arrayBox[to.x.pinLastValue()][to.y.pinLastValue()]), arrayValue[to.x.pinLastValue()][to.y.pinLastValue()].toString());
        });

        animationDriver.start();
    }

    async function AnimateMove(object, to){
        let toPosition = GetPosition(to.x.pinLastValue(),to.y.pinLastValue());

        let animationDriver = Animation.timeDriver({
            durationMilliseconds: 500,
            loopCount: 1,
            mirror: false
        });

        let animationSamplerX = Animation.samplers.linear((await object).transform.x.pinLastValue(), toPosition.x);
        let animationSamplerZ = Animation.samplers.linear((await object).transform.z.pinLastValue(), toPosition.y);

        let animationX = Animation.animate(animationDriver, animationSamplerX);
        let animationZ = Animation.animate(animationDriver, animationSamplerZ);

        (await object).transform.x = animationX;
        (await object).transform.z = animationZ;

        animationDriver.start();
    }

    function SetBoxText(box, text){
        box.inputs.setString('Text', text);
    }

    function SetBoxColor(box, color){
        box.inputs.setColor('BoxColor', color);
    }

    function GetPosition(gridX, gridY){
        let position = {
            x: gridX * 0.125 - 0.185,
            y: gridY * 0.125 - 0.185
        };
        return position;
    }

  })();