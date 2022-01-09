const Scene = require('Scene');
const Animation = require('Animation');
const Blocks = require('Blocks');
const TouchGestures = require('TouchGestures');
const Random = require('Random');
const Reactive = require('Reactive');
const Diagnostics = require('Diagnostics');
const { off } = require('process');
const { DEFAULT_ENCODING } = require('crypto');
const { ifThenElse } = require('Reactive');

(async function () { 

    const placer = await Scene.root.findFirst('Placer');
    const floor = await Scene.root.findFirst('Floor');

    let arrayBox = new Array(4).fill(null).map(row => new Array(4).fill(null));
    let arrayValue = new Array(4).fill(null).map(row => new Array(4).fill(null));

    let swipeThresholdY = 0.15;
    let swipeThresholdX = 0.30;

    let animationCount = 0;

    StartGame();

    Diagnostics.watch('Animation Count - ', animationCount);

    TouchGestures.onLongPress().subscribe( () =>{
        BoxInstantiate(Math.round(Math.random()*3), Math.round(Math.random()*3), 2);
    });

    TouchGestures.onPan({normalizeCoordinates: true}).subscribe( (gesture) => {

        Diagnostics.watch('Xdelta - ', gesture.translation.x);
        Diagnostics.watch('Ydelta - ', gesture.translation.y);

        const direction = Reactive.ifThenElse(gesture.translation.y.lt(-swipeThresholdY), 0,
        (Reactive.ifThenElse(gesture.translation.x.gt(swipeThresholdX), 1,
        (Reactive.ifThenElse(gesture.translation.y.gt(swipeThresholdY), 2, 
        (Reactive.ifThenElse(gesture.translation.x.lt(-swipeThresholdX), 3, -1)))))));

        direction.gt(-1).onOn().subscribe( () => {
            if(animationCount == 0){
                Move(direction.pinLastValue());
            }
        });

        /*
        Reactive.and(gesture.translation.y.lt(-swipeThreshold), canSwipe).onOn().subscribe(() => {
            canSwipe = false;
            Diagnostics.log('CanSwipe - ' + canSwipe);
            Move(0);
        });
        Reactive.and(gesture.translation.x.gt(swipeThreshold), canSwipe).onOn().subscribe(() => {
            canSwipe = false;
            Diagnostics.log('CanSwipe - ' + canSwipe);
            Move(1);
        });
        Reactive.and(gesture.translation.y.gt(swipeThreshold), canSwipe).onOn().subscribe(() => {
            canSwipe = false;
            Diagnostics.log('CanSwipe - ' + canSwipe);
            Move(2);
        });
        Reactive.and(gesture.translation.x.lt(-swipeThreshold), canSwipe).onOn().subscribe(() => {
            canSwipe = false;
            Diagnostics.log('CanSwipe - ' + canSwipe);
            Move(3);
        });
        */

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
            SetBoxColor(box, GetColorByValue(value));
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
                            }else{
                                break;
                            }
                        }
                        if(merge) continue;
                        if(offset > 0){
                            let tempBox = arrayBox[x][y];
                            let tempValue = arrayValue[x][y];

                            arrayBox[x][y] = null;
                            arrayBox[x][y-offset] = tempBox;

                            arrayValue[x][y] = null;
                            arrayValue[x][y-offset] = tempValue;

                            AnimateMove(tempBox, Reactive.point2d(x, y-offset));

                            Diagnostics.log('Move '+ x + y +' to ' + x + (y - offset));
                            Diagnostics.log(arrayValue);
                        }
                    }
                }
            }
        }else if(direction == 1){
            for(let x = 2; x >= 0; x--){
                for(let y = 0; y < 4; y++){
                    if(arrayBox[x][y] != null){
                        let offset = 0;
                        let merge = false;
                        for(let d = 1; d <= 3-x; d++){
                            if(arrayBox[x+d][y] == null){
                                offset++;
                            }else if (arrayValue[x][y] == arrayValue[x+d][y]){
                                merge = true;
                                
                                AnimateMerge(arrayBox[x][y], Reactive.point2d(x+d, y));
                                
                                arrayValue[x+d][y] += arrayValue[x][y];
                                arrayValue[x][y] = null;

                                arrayBox[x][y] = null;
                                Diagnostics.log("Merge to " + (x+d) + y);
                                break;
                            }else{
                                break;
                            }
                        }
                        if(merge) continue;
                        if(offset > 0){
                            let tempBox = arrayBox[x][y];
                            let tempValue = arrayValue[x][y];

                            arrayBox[x][y] = null;
                            arrayBox[x+offset][y] = tempBox;

                            arrayValue[x][y] = null;
                            arrayValue[x+offset][y] = tempValue;

                            AnimateMove(tempBox, Reactive.point2d(x+offset, y));

                            Diagnostics.log('Move '+ x + y +' to ' + (x+offset) + y);
                            Diagnostics.log(arrayValue);
                        }
                    }
                }
            }
        }else if(direction == 2){
            for(let x = 0; x < 4; x++){
                for(let y = 2; y >= 0; y--){
                    if(arrayBox[x][y] != null){
                        let offset = 0;
                        let merge = false;
                        for(let d = 1; d <= 3-y; d++){
                            if(arrayBox[x][y+d] == null){
                                offset++;
                            }else if (arrayValue[x][y] == arrayValue[x][y+d]){
                                merge = true;
                                
                                AnimateMerge(arrayBox[x][y], Reactive.point2d(x, y+d));
                                
                                arrayValue[x][y+d] += arrayValue[x][y];
                                arrayValue[x][y] = null;

                                arrayBox[x][y] = null;
                                Diagnostics.log("Merge to " + x + (y+d));
                                break;
                            }else{
                                break;
                            }
                        }
                        if(merge) continue;
                        if(offset > 0){
                            let tempBox = arrayBox[x][y];
                            let tempValue = arrayValue[x][y];

                            arrayBox[x][y] = null;
                            arrayBox[x][y+offset] = tempBox;

                            arrayValue[x][y] = null;
                            arrayValue[x][y+offset] = tempValue;

                            AnimateMove(tempBox, Reactive.point2d(x, y+offset));

                            Diagnostics.log('Move '+ x + y +' to ' + x + (y+offset));
                            Diagnostics.log(arrayValue);
                        }
                    }
                }
            }
        }else if(direction == 3){
            for(let x = 1; x < 4; x++){
                for(let y = 0; y < 4; y++){
                    if(arrayBox[x][y] != null){
                        let offset = 0;
                        let merge = false;
                        for(let d = 1; d <= x; d++){
                            if(arrayBox[x-d][y] == null){
                                offset++;
                            }else if (arrayValue[x][y] == arrayValue[x-d][y]){
                                merge = true;
                                
                                AnimateMerge(arrayBox[x][y], Reactive.point2d(x-d, y));
                                
                                arrayValue[x-d][y] += arrayValue[x][y];
                                arrayValue[x][y] = null;

                                arrayBox[x][y] = null;
                                Diagnostics.log("Merge to " + (x-d) + y);
                                break;
                            }else{
                                break;
                            }
                        }
                        if(merge) continue;
                        if(offset > 0){
                            let tempBox = arrayBox[x][y];
                            let tempValue = arrayValue[x][y];

                            arrayBox[x][y] = null;
                            arrayBox[x-offset][y] = tempBox;

                            arrayValue[x][y] = null;
                            arrayValue[x-offset][y] = tempValue;

                            AnimateMove(tempBox, Reactive.point2d(x-offset, y));

                            Diagnostics.log('Move '+ x + y +' to ' + (x-offset) + y);
                            Diagnostics.log(arrayValue);
                        }
                    }
                }
            }
        }
    }

    async function AnimateMerge(object, to){
        animationCount += 1;
        
        let objectLink = (await object);
        let toPosition = GetPosition(to.x.pinLastValue(),to.y.pinLastValue());

        let animationDriver = Animation.timeDriver({
            durationMilliseconds: Math.sqrt(Math.pow((toPosition.x - objectLink.transform.x.pinLastValue()), 2) + Math.pow((toPosition.y - objectLink.transform.z.pinLastValue()), 2)) * 2500 / 2,
            loopCount: 1,
            mirror: false
        });

        let animationSamplerX = Animation.samplers.linear(objectLink.transform.x.pinLastValue(), toPosition.x);
        let animationSamplerZ = Animation.samplers.linear(objectLink.transform.z.pinLastValue(), toPosition.y);

        let animationX = Animation.animate(animationDriver, animationSamplerX);
        let animationZ = Animation.animate(animationDriver, animationSamplerZ);

        objectLink.transform.x = animationX;
        objectLink.transform.z = animationZ;

        animationDriver.onCompleted().subscribe( async () =>{
            animationCount -= 1;
            Scene.destroy(objectLink);

            let boxToSetup = (await arrayBox[to.x.pinLastValue()][to.y.pinLastValue()]);
            SetBoxText(boxToSetup, arrayValue[to.x.pinLastValue()][to.y.pinLastValue()].toString());
            SetBoxColor(boxToSetup, GetColorByValue(arrayValue[to.x.pinLastValue()][to.y.pinLastValue()]));
        });

        animationDriver.start();
    }

    async function AnimateMove(object, to){
        animationCount += 1;

        let toPosition = GetPosition(to.x.pinLastValue(),to.y.pinLastValue());

        let animationDriver = Animation.timeDriver({
            durationMilliseconds: Math.sqrt(Math.pow((toPosition.x - (await object).transform.x.pinLastValue()), 2) + Math.pow((toPosition.y - (await object).transform.z.pinLastValue()), 2)) * 2500 / 2,
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

        animationDriver.onCompleted().subscribe( () => {
            animationCount -= 1;
        })
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

    function GetColorByValue(value){
        return Reactive.RGBA(RandomBySeed(value), RandomBySeed(Math.pow(value,2)), RandomBySeed(Math.pow(value,3)), 1);
    }

    function RandomBySeed(seed){
        let x = Math.sin(seed++);
        return x - Math.floor(x);
    }

  })();