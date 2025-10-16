const Scene = require('Scene');
const Animation = require('Animation');
const Audio = require('Audio');
const Blocks = require('Blocks');
const TouchGestures = require('TouchGestures');
const Persistence = require('Persistence');
const Time = require('Time');
const Patches = require('Patches');
const Reactive = require('Reactive');
const Textures = require('Textures');

(async function () { 

    const placer = await Scene.root.findFirst('Placer');
    const buttonStart = await Scene.root.findFirst('ButtonStartGame');
    const buttonTryAgain = await Scene.root.findFirst('ButtonTryAgain');
    const scoreText = await Scene.root.findFirst('ScoreText');
    const bestText = await Scene.root.findFirst('BestText');
    const swipeTip = await Scene.root.findFirst('SwipeTip');

    const audioMerge = await Audio.getAudioPlaybackController("AudioMerge");
    const audioMove = await Audio.getAudioPlaybackController("AudioMove");

    const arrayIcon = 
    {
        2: await Textures.findFirst('Sprite_Tiles_0'),
        4: await Textures.findFirst('Sprite_Tiles_1'),
        8: await Textures.findFirst('Sprite_Tiles_2'),
        16: await Textures.findFirst('Sprite_Tiles_3'),
        32: await Textures.findFirst('Sprite_Tiles_4'),
        64: await Textures.findFirst('Sprite_Tiles_5'),
        128: await Textures.findFirst('Sprite_Tiles_6'),
        256: await Textures.findFirst('Sprite_Tiles_7'),
        512: await Textures.findFirst('Sprite_Tiles_8'),
        1024: await Textures.findFirst('Sprite_Tiles_9'),
        2048: await Textures.findFirst('Sprite_Tiles_10'),
        4096: await Textures.findFirst('Sprite_Tiles_11'),
        8192: await Textures.findFirst('Sprite_Tiles_12'),
        16384: await Textures.findFirst('Sprite_Tiles_13'),
        32768: await Textures.findFirst('Sprite_Tiles_14'),
        65536: await Textures.findFirst('Sprite_Tiles_15'),
        131072: await Textures.findFirst('Sprite_Tiles_16')
    }

    const arrayColor = {
        2: Reactive.RGBA(0.254902, 0.4470588, 1, 1),
        4: Reactive.RGBA(0.5882353, 0.3137255, 0.6078432, 1),
        8: Reactive.RGBA(0.254902, 0.6352941, 1, 1),
        16: Reactive.RGBA(0.7803922, 0.7333333, 0.227451, 1),
        32: Reactive.RGBA(0.88, 0.42, 0.3, 1),
        64: Reactive.RGBA(0.69, 0.23, 0.81, 1),
        128: Reactive.RGBA(0.8018868, 0.2080367, 0.4520687, 1),
        256: Reactive.RGBA(0.754717, 0.1793145, 0.1673193, 1),
        512: Reactive.RGBA(0.7830189, 0.463211, 0.1883677, 1),
        1024: Reactive.RGBA(0.7414356, 0.7830189, 0, 1),
        2048: Reactive.RGBA(0.4324116, 0.735849, 0.01735493, 1),
        4096: Reactive.RGBA(0.04184154, 0.7830189, 0.01108044, 1),
        8192: Reactive.RGBA(0, 0.6415094, 0.2216436, 1),
        16384: Reactive.RGBA(0, 0.7735849, 0.5514137, 1),
        32768: Reactive.RGBA(0, 0.745283, 0.7226967, 1),
        65536: Reactive.RGBA(0, 0.8233426, 1, 1),
        131072: Reactive.RGBA(0, 0.1231611, 0.8396226, 1)
    };

    const persistenceLocal = Persistence.local;

    let started = false;
    let score = 0;
    let best = 0;

    let arrayBox = new Array(4).fill(null).map(row => new Array(4).fill(null));
    let arrayValue = new Array(4).fill(null).map(row => new Array(4).fill(null));

    let swipeThresholdY = 0.075;
    let swipeThresholdX = 0.15;

    let animationCount = 0;

    try {
        const result = await persistenceLocal.get('data');
        best = result.best;
        bestText.text = 'High score:\n' + best;
    } catch (error) {
    }

    Patches.inputs.setBoolean('Started', false);

    TouchGestures.onTap(buttonStart).subscribe( () =>{
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
                await BoxInstantiate(x, y, 2);
                boxCount++;
            }
        }
        started = true;

        score = 0;
        scoreText.text = 'Score:\n' + score.toString();
    }

    async function Lose(){
        started = false;
        buttonTryAgain.hidden = false;
        if(score > best){
            best = score;
            let data = {best: best};
            bestText.text = 'High score:\n' + best;
            try {
                await Persistence.local.set('data', data);
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
            SetBoxIcon(box, GetTextureByValue(value));

            /*
            let animationDriver = Animation.timeDriver({
                durationMilliseconds: 200,
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
            */

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
                            audioMerge.reset();
                            audioMerge.setPlaying(true);
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

                            audioMove.reset();
                            audioMove.setPlaying(true);
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
                            audioMerge.reset();
                            audioMerge.setPlaying(true);
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

                            audioMove.reset();
                            audioMove.setPlaying(true);
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
                            audioMerge.reset();
                            audioMerge.setPlaying(true);
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

                            audioMove.reset();
                            audioMove.setPlaying(true);
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
                            audioMerge.reset();
                            audioMerge.setPlaying(true);
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

                            audioMove.reset();
                            audioMove.setPlaying(true);
                        }
                    }
                }
            }
        }

        let freePlaces = 0;

        for(let x = 0; x < 4; x++){
            for(let y = 0; y < 4; y++){
                if(arrayValue[x][y] == null){
                    freePlaces++
                }
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
    }

    async function AnimateMerge(object, to){
        animationCount += 1;
        
        let objectLink = (await object);
        let toPosition = GetPosition(to.x.pinLastValue(),to.y.pinLastValue());

        let animationDriver = Animation.timeDriver({
            durationMilliseconds: 200,//Math.sqrt(Math.pow((toPosition.x - objectLink.transform.x.pinLastValue()), 2) + Math.pow((toPosition.y - objectLink.transform.z.pinLastValue()), 2)) * 2500 / 2,
            loopCount: 1,
            mirror: false
        });

        let animationSamplerMoveX = Animation.samplers.linear(objectLink.transform.x.pinLastValue(), toPosition.x);
        let animationSamplerMoveZ = Animation.samplers.linear(objectLink.transform.z.pinLastValue(), toPosition.y);

        let animationMoveX = Animation.animate(animationDriver, animationSamplerMoveX);
        let animationMoveZ = Animation.animate(animationDriver, animationSamplerMoveZ);

        let animationSamplerScale = Animation.samplers.linear(1, 0.25);
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
            SetBoxIcon(boxToSetup, GetTextureByValue(arrayValue[to.x.pinLastValue()][to.y.pinLastValue()]));

            score += arrayValue[to.x.pinLastValue()][to.y.pinLastValue()];
            scoreText.text = 'Score:\n' + score.toString();

            let animationDriverGrow = Animation.timeDriver({
                durationMilliseconds: 100,
                loopCount: 2,
                mirror: true
            });
            let animationSamplerGrow = Animation.samplers.linear(1, 1.25, 1);
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
            durationMilliseconds: 200,//Math.sqrt(Math.pow((toPosition.x - (await object).transform.x.pinLastValue()), 2) + Math.pow((toPosition.y - (await object).transform.z.pinLastValue()), 2)) * 2500 / 2,
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

    function SetBoxIcon(box, texture)
    {
        box.inputs.setShader('Icon', texture.signal);
    }

    function GetPosition(gridX, gridY){
        let position = {
            x: gridX * 0.125 - 0.185,
            y: gridY * 0.125 - 0.185
        };
        return position;
    }

    function GetColorByValue(value){
        return arrayColor[value] || arrayColor[2];
        //return Reactive.RGBA(RandomBySeed(value), RandomBySeed(Math.pow(value,2)), RandomBySeed(Math.pow(value,3)), 1);
    }

    function GetTextureByValue(value)
    {
        return arrayIcon[value] || arrayIcon[2];
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