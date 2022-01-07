const Scene = require('Scene');
const Blocks = require('Blocks');
const Reactive = require('Reactive');
const Diagnostics = require('Diagnostics');

(async function () {  // Enables async/await in JS [part 1]

    const placer = await Scene.root.findFirst('Placer');
    const floor = await Scene.root.findFirst('Floor');

    const arrayBox = [];
    const arrayText = [];

    for (let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++){
            arrayBox[x,y] = await Blocks.instantiate('BoxPrefab', {"name":"Box"+x+y});
            placer.addChild(arrayBox[x,y]);
            arrayBox[x,y].transform.x = x * 0.125 - 0.185;
            arrayBox[x,y].transform.z = y * 0.125 - 0.185;
        }
    }

  })();