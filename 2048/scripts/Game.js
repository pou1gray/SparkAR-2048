const Scene = require('Scene');
const Animation = require('Animation');
const Blocks = require('Blocks');
const TouchGestures = require('TouchGestures');
const Persistence = require('Persistence');
const Time = require('Time');
const Patches = require('Patches');
const Reactive = require('Reactive');
const Diagnostics = require('Diagnostics');

(async function () { 

    const placer = await Scene.root.findFirst('Placer');
    const floor = await Scene.root.findFirst('Floor');

    const buttonStart = await Scene.root.findFirst('ButtonStartGame');
    const buttonTryAgain = await Scene.root.findFirst('ButtonTryAgain');
    const scoreText = await Scene.root.findFirst('ScoreText');
    const bestText = await Scene.root.findFirst('BestText');
    const swipeTip = await Scene.root.findFirst('SwipeTip');

    const userScope = Persistence.userScope;

    let started = false;
    let score = 0;
    let best = 0;

    let arrayBox = new Array(4).fill(null).map(row => new Array(4).fill(null));
    let arrayValue = new Array(4).fill(null).map(row => new Array(4).fill(null));

    let swipeThresholdY = 0.075;
    let swipeThresholdX = 0.15;

    let animationCount = 0;

    try {
        const result = await userScope.get('data');
        best = result.best;
        bestText.text = 'Best:\n' + best;
    } catch (error) {
        Diagnostics.log('Error - ' + error);
    }

    Patches.inputs.setBoolean('Started', false);

    TouchGestures.onTap(buttonStart).subscribe( () =>{
        started = true;
        buttonStart.hidden = true;
        Patches.inputs.setBoolean('Started', true);
        swipeTip.hidden = false;
        Time.setTimeout(HideSwipeTip, 3000);
        StartGame();
    });

    TouchGestures.onTap(buttonTryAgain).subscribe( () =>{
        buttonTryAgain.hidden = true;
        for(let x = 0; x < 4; x++){
            for(let y = 0; y < 4; y++){
                if(arrayValue[x][y] != null){
                    Scene.destroy(arrayBox[x][y]);
                    arrayBox[x][y] = null;
                    arrayValue[x][y] = null;
                }
            }
        }
        StartGame();
    });
    
    TouchGestures.onPan({normalizeCoordinates: true}).subscribe( (gesture) => {
        
        const direction = Reactive.ifThenElse(gesture.translation.y.lt(-swipeThresholdY), 0,
        (Reactive.ifThenElse(gesture.translation.x.gt(swipeThresholdX), 1,
        (Reactive.ifThenElse(gesture.translation.y.gt(swipeThresholdY), 2, 
        (Reactive.ifThenElse(gesture.translation.x.lt(-swipeThresholdX), 3, -1)))))));
        
        direction.gt(-1).onOn().subscribe( () => {
            if(animationCount == 0 && started){
                Move(direction.pinLastValue());
            }
        });
        
    });
    
    function HideSwipeTip(){
        swipeTip.hidden = true;
    }

    async function StartGame(){
        let boxCount = 0;
        while(boxCount < 2){

            let x = GetRandom(0, 3);
            let y = GetRandom(0, 3);

            if(arrayValue[x][y] == null){
                BoxInstantiate(x, y, 2);
                boxCount++;
            }
        }
    }

    async function Lose(){
        started = false;
        buttonTryAgain.hidden = false;
        if(score > best){
            best = score;
            let data = {best: best}
            bestText.text = 'Best:\n' + best;
            try {
                await userScope.set('data', data);
              } catch (error) {
                  Diagnostics.log('Error - ' + error);
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

            let animationDriver = Animation.timeDriver({
                durationMilliseconds: 500,
                loopCount: 1,
                mirror: false
            });
    
            let animationSamplerX = Animation.samplers.linear(0, 1);
            let animationSamplerY = Animation.samplers.linear(0, 1);
            let animationSamplerZ = Animation.samplers.linear(0, 1);
    
            let animationX = Animation.animate(animationDriver, animationSamplerX);
            let animationY = Animation.animate(animationDriver, animationSamplerY);
            let animationZ = Animation.animate(animationDriver, animationSamplerZ);

            box.transform.scaleX = animationX;
            box.transform.scaleY = animationY;
            box.transform.scaleZ = animationZ;
            
            animationDriver.start();

            return box;
        }else{
            return null;
        }
    }

    function Move(direction){
        let somethingChanged = false;
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
                                break;
                            }else{
                                break;
                            }
                        }
                        if(merge){
                            somethingChanged = true;
                            continue;
                        }
                        if(offset > 0){
                            somethingChanged = true;
                            let tempBox = arrayBox[x][y];
                            let tempValue = arrayValue[x][y];

                            arrayBox[x][y] = null;
                            arrayBox[x][y-offset] = tempBox;

                            arrayValue[x][y] = null;
                            arrayValue[x][y-offset] = tempValue;

                            AnimateMove(tempBox, Reactive.point2d(x, y-offset));
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
                                break;
                            }else{
                                break;
                            }
                        }
                        if(merge){
                            somethingChanged = true;
                            continue;
                        }
                        if(offset > 0){
                            somethingChanged = true;
                            let tempBox = arrayBox[x][y];
                            let tempValue = arrayValue[x][y];

                            arrayBox[x][y] = null;
                            arrayBox[x+offset][y] = tempBox;

                            arrayValue[x][y] = null;
                            arrayValue[x+offset][y] = tempValue;

                            AnimateMove(tempBox, Reactive.point2d(x+offset, y));
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
                                break;
                            }else{
                                break;
                            }
                        }
                        if(merge){
                            somethingChanged = true;
                            continue;
                        }
                        if(offset > 0){
                            somethingChanged = true;
                            let tempBox = arrayBox[x][y];
                            let tempValue = arrayValue[x][y];

                            arrayBox[x][y] = null;
                            arrayBox[x][y+offset] = tempBox;

                            arrayValue[x][y] = null;
                            arrayValue[x][y+offset] = tempValue;

                            AnimateMove(tempBox, Reactive.point2d(x, y+offset));
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
                                break;
                            }else{
                                break;
                            }
                        }
                        if(merge){
                            somethingChanged = true;
                            continue;
                        }
                        if(offset > 0){
                            somethingChanged = true;
                            let tempBox = arrayBox[x][y];
                            let tempValue = arrayValue[x][y];

                            arrayBox[x][y] = null;
                            arrayBox[x-offset][y] = tempBox;

                            arrayValue[x][y] = null;
                            arrayValue[x-offset][y] = tempValue;

                            AnimateMove(tempBox, Reactive.point2d(x-offset, y));
                        }
                    }
                }
            }
        }

        let freePlaces = 0;
        let scoreValue = 0;

        for(let x = 0; x < 4; x++){
            for(let y = 0; y < 4; y++){
                if(arrayValue[x][y] == null){
                    freePlaces++
                } else scoreValue += arrayValue[x][y];
            }
        }

        if(freePlaces > 0){
            if(somethingChanged){
                let instantiated = false;
                while(instantiated == false){
                    let x = GetRandom(0, 3);
                    let y = GetRandom(0, 3);
                    if(arrayValue[x][y] == null){
                        BoxInstantiate(x, y, 2);
                        instantiated = true;
                    }
                }
            }
        }else{
            Lose();
        }

        score = scoreValue;
        scoreText.text = 'Score:\n' + scoreValue.toString();
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

        let animationSamplerMoveX = Animation.samplers.linear(objectLink.transform.x.pinLastValue(), toPosition.x);
        let animationSamplerMoveZ = Animation.samplers.linear(objectLink.transform.z.pinLastValue(), toPosition.y);

        let animationMoveX = Animation.animate(animationDriver, animationSamplerMoveX);
        let animationMoveZ = Animation.animate(animationDriver, animationSamplerMoveZ);

        let animationSamplerScale = Animation.samplers.linear(1, 0.75);
        let animationScale = Animation.animate(animationDriver, animationSamplerScale);

        objectLink.transform.x = animationMoveX;
        objectLink.transform.z = animationMoveZ;

        objectLink.transform.scaleX = animationScale;
        objectLink.transform.scaleY = animationScale;
        objectLink.transform.scaleZ = animationScale;

        animationDriver.onCompleted().subscribe( async () =>{
            animationCount -= 1;
            Scene.destroy(objectLink);

            let boxToSetup = (await arrayBox[to.x.pinLastValue()][to.y.pinLastValue()]);
            SetBoxText(boxToSetup, arrayValue[to.x.pinLastValue()][to.y.pinLastValue()].toString());
            SetBoxColor(boxToSetup, GetColorByValue(arrayValue[to.x.pinLastValue()][to.y.pinLastValue()]));

            let animationDriverGrow = Animation.timeDriver({
                durationMilliseconds: 150,
                loopCount: 2,
                mirror: true
            });
            let animationSamplerGrow = Animation.samplers.linear(1, 1.15);
            let animationGrow = Animation.animate(animationDriverGrow, animationSamplerGrow);

            boxToSetup.transform.scaleX = animationGrow;
            boxToSetup.transform.scaleY = animationGrow;
            boxToSetup.transform.scaleZ = animationGrow;

            animationDriverGrow.start();
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
        let x = Math.cos(seed++);
        return x - Math.floor(x);
    }

    function GetRandom(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

  })();