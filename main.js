var fnMain = (function() {
    function render(deltaMs, state) {
        requestAnimationFrame(function(timestamp){
            render(timestamp, state);
        });
        state.app.renderer.render(state.app.stage);
        state.recorder.capture(state.app.renderer.view);
    }

    function getConfig() {
        const patternRepeats = 3;
        const twillWidth = 4;
        const mergePatternEnds = false;
        const showWarp = true;
        const showWeft = true;
        const enableMask = true;
        const stripeBlendMode = PIXI.BLEND_MODES.NORMAL;
        const backgroundColor = colorStringToNumber('black');
        const screenMargin = 0;
        const cyclePause = 0;
        const randomSequenceStrategy = {
            stripesMin: 4,
            stripesMax: 17,
            widthMin: 1,
            widthMax: 20,
        }
        const markovSequenceStrategy = {
            stripesMin: 6,
            stripesMax: 24,
        };
        const randomColorStrategy = {
            maxBaseColors: 5,
        }
        const strategies = {
            randomColor: randomColorStrategy,
            randomSequence: randomSequenceStrategy,
            markovSequence: markovSequenceStrategy,
        }
        const config = {
            stripeBlendMode: stripeBlendMode,
            patternRepeats: patternRepeats,
            cyclePause: cyclePause,
            screenMargin: screenMargin,
            backgroundColor: backgroundColor,
            twillWidth: twillWidth,
            mergePatternEnds: mergePatternEnds,
            showWarp: showWarp,
            showWeft: showWeft,
            enableMask: enableMask,
            strategies: strategies,
        };
        return config;
    }

    function makeBoardRectangle(margin, viewRectangle) {
        const xmargin = margin * viewRectangle.width;
        const ymargin = margin * viewRectangle.height;
        const boardWidth = viewRectangle.width - (xmargin * 2);
        const boardHeight = viewRectangle.height - (ymargin * 2);
        return new PIXI.Rectangle(xmargin, ymargin, boardWidth, boardHeight);
    }

    function makeRange(n) {
        var arr = Array.apply(null, Array(n));
        return arr.map(function (x, i) { return i });
    };

    function RGBTo24bit(rgbArray) {
        let result = Math.floor(rgbArray[2])
            | Math.floor(rgbArray[1]) << 8
            | Math.floor(rgbArray[0]) << 16;
        return result;
    }

    function colorStringToNumber(name) {
        return RGBTo24bit(chroma(name).rgb());
    }

    function colorNumberToHexString(number) {
        return chroma(number).hex();
    }

    function portion(i, size) {
        return i / ((size -1) || 1);
    }

    function randomIntInclusive(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function weightedChoice(values, weights) {
        let mass = 1;
        for(let i = 0; i < values.length; i++) {
            const weight = weights[i];
            const value = values[i];
            const flip = Math.random() < (weight / mass);
            if(flip) return value;
            mass -= weight;
        }
        console.log("weighted choice exceeded probability mass.");
        console.log(weights);
        return values[values.length - 1];
    }

    function generateSequencePairs(config) {
        //const manual = [{"width":95,"color":"#1C0070"},{"width":32,"color":"#101010"},{"width":32,"color":"#006818"},{"width":8,"color":"#440044"},{"width":32,"color":"#006818"},{"width":8,"color":"#101010"},{"width":8,"color":"#FCFCFC"}];
        //const manual = [{"width":9,"color":"#C80000"},{"width":51,"color":"#006818"},{"width":9,"color":"#2C2C80"},{"width":34,"color":"#006818"},{"width":77,"color":"#2C2C80"},{"width":13,"color":"#F8F8F8"},{"width":9,"color":"#C80000"},{"width":9,"color":"#F8F8F8"}];
        //const manual = [{"width":4,"color":"#2C2C80"},{"width":4,"color":"#101010"},{"width":32,"color":"#2C2C80"},{"width":30,"color":"#101010"},{"width":4,"color":"#E8C000"},{"width":32,"color":"#006818"},{"width":4,"color":"#101010"},{"width":32,"color":"#006818"},{"width":4,"color":"#E0E0E0"},{"width":34,"color":"#101010"},{"width":8,"color":"#1C0070"},{"width":12,"color":"#D05054"},{"width":6,"color":"#101010"},{"width":4,"color":"#E8C000"}];
        //const manual = [{"width":8,"color":"#E0E0E0"},{"width":6,"color":"#1474B4"},{"width":6,"color":"#E0E0E0"},{"width":6,"color":"#1474B4"},{"width":3,"color":"#E0E0E0"},{"width":69,"color":"#1474B4"},{"width":11,"color":"#003C64"},{"width":11,"color":"#888888"},{"width":3,"color":"#5C8CA8"},{"width":3,"color":"#888888"},{"width":3,"color":"#5C8CA8"},{"width":11,"color":"#888888"},{"width":11,"color":"#003C64"},{"width":3,"color":"#901C38"},{"width":3,"color":"#003C64"},{"width":8,"color":"#901C38"},{"width":3,"color":"#003C64"},{"width":3,"color":"#901C38"},{"width":11,"color":"#003C64"},{"width":3,"color":"#E0E0E0"},{"width":6,"color":"#003C64"},{"width":8,"color":"#E0E0E0"},{"width":14,"color":"#C80000"}];
        //const manual = [{"width":13,"color":"#A8ACE8"},{"width":3,"color":"#101010"},{"width":47,"color":"#1C0070"},{"width":27,"color":"#101010"},{"width":20,"color":"#1C0070"},{"width":7,"color":"#880000"},{"width":20,"color":"#1C0070"},{"width":10,"color":"#880000"},{"width":20,"color":"#1C0070"},{"width":7,"color":"#880000"},{"width":20,"color":"#1C0070"},{"width":7,"color":"#101010"},{"width":7,"color":"#D09800"}];
        //const manual = [{width: 1, color: "blue"},{width: 1, color: "white"}];
        //return manual;

        const sequence = seqGenCatalog.markov(config);
        const colors = colorGenCatalog.random(config, sequence.length);
        const result = sequence.map((x,i) => {return {width: x, color: colors[i]};});
        console.log(result);
        return result;
    }

    const seqGenCatalog = (function(){
        function naiveRandom(config) {
            const strat = config.strategies.randomSequence;
            const numStripes = randomIntInclusive(strat.stripesMin, strat.stripesMax);
            const stripes = makeRange(numStripes).map(() => randomIntInclusive(strat.widthMin, strat.widthMax));
            return stripes;
        }

        function markov(config) {
            const stats = getPatternStats();
            const strat = config.strategies.markovSequence;
            const sizes = stats.filter(x => x != undefined).map(x => x.state);
            const initial = sizes[Math.floor(Math.random() * sizes.length)];
            const numStripes = randomIntInclusive(strat.stripesMin, strat.stripesMax);
            function next(current) {
                const pairs = stats[current].transitions;
                const validPairs = pairs.filter(x => x.probability > 0);
                const values = validPairs.map(x => x.dest);
                const weights = validPairs.map(x => x.probability);
                const result = weightedChoice(values, weights);
                return result;
            }
            const result = makeRange(numStripes - 1).reduce((a,b) => a.concat(next(a[a.length - 1])), [initial]);
            return result;
        }

        return {
            random: naiveRandom,
            markov: markov,
        }
    })();

    const colorGenCatalog = (function() {
        function naiveRandom(config, length) {
            //config.patternRepeats = randomIntInclusive(1,4);
            //config.twillWidth = randomIntInclusive(2, 6);
            const strat = config.strategies.randomColor;
            const stops = randomIntInclusive(2, strat.maxBaseColors);
            const scale = chroma.scale(makeRange(stops).map(x => chroma.random())).mode('lab');
            const samples = scale.colors(length, format=null);
            const colorBag = samples.concat([chroma('black'), chroma('white')]).map(x => x.hex());
            const result = makeRange(length).map(() => colorBag[Math.floor(Math.random() * colorBag.length)]);
            return result;
        }

        return {
            random: naiveRandom
        }
    })();

    function makeBackground(config, screenRect, renderer) {
        const canvasElement = document.createElement('canvas');
        canvasElement.width = screenRect.width;
        canvasElement.height = screenRect.height;
        const context = canvasElement.getContext('2d');
        context.fillStyle = config.backgroundColor;
        context.fillRect(0, 0, screenRect.width, screenRect.height);
        const texture = PIXI.Texture.fromCanvas(canvasElement);
        const sprite = new PIXI.Sprite(texture);
        return sprite;
    }

    function makeMaskSprite(config, board, renderer) {
        const width = board.width;
        const height = board.height;
        const canvasElement = document.createElement('canvas');
        canvasElement.width = width;
        canvasElement.height = height;
        const ctx = canvasElement.getContext('2d');
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        if(data.length < (width * height)) { throw "mask wasn't large enough."; }
        for(let j = 0; j < width; j++) {
            for(let k = 0; k < height; k++) {
                if(((j+k) % (config.twillWidth * 2)) < config.twillWidth) {
                const d = config.twillWidth * 2;
                const r = config.twillWidth;
                //if((k % 2 == 0 && j % d < r) || k % 2 == 1 && j % d > 2) {
                    const t = (k * width + j) * 4;
                    data[t] = 255;
                    data[t+1] = 255;
                    data[t+2] = 255;
                    data[t+3] = 255;
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
        const texture = PIXI.Texture.fromCanvas(canvasElement);
        const sprite = new PIXI.Sprite(texture);
        sprite.x = board.left;
        sprite.y = board.top;
        return sprite;
    }

    function makePattern(config, board, renderer) {
        function mirrorAndRepeat(seq, repeatCount) {
            const cutoff = config.mergePatternEnds ? 1 : 0;
            const mirrored = seq.concat(seq.slice(0, seq.length - cutoff).reverse());
            let repeated = [];
            for(let i = 0; i < repeatCount; i++) {
                for(let m of mirrored.slice(0, mirrored.length - cutoff)) {
                    repeated.push(m);
                }
            }
            return repeated;
        }
        const sequencePairs = generateSequencePairs(config);
        const colorSeq = sequencePairs.map(x => x.color);
        const widthSeq = sequencePairs.map(x => x.width);
        const colors = mirrorAndRepeat(colorSeq, config.patternRepeats);
        function sequenceToShapes(seq, setter) {
            const render = mirrorAndRepeat(seq, config.patternRepeats);
            const sum = render.reduce((a,b) => a + b);
            if(sum < 1) { throw "sequence must be positive"; }
            const longDimension = board.width < board.height ? board.height : board.width;
            const boardScalar = longDimension / sum;
            const intervals = render.map(x => x * boardScalar);
            const shapes = intervals.map((interval, index) => {
                const result = {
                    width: board.width,
                    height: board.height,
                    y: board.top,
                    x: board.left,
                    color: colors[index],
                };
                setter(result, interval);
                return result;
            }).filter(s => s.x <= board.right && s.y <= board.bottom);
            return shapes;
        }
        function mapSprite(obj) {
            const width = obj.width;
            const height = obj.height;
            const gfx = new PIXI.Graphics();
            gfx.width = width;
            gfx.height = height;
            const color = colorStringToNumber(obj.color);
            gfx.beginFill(color);
            gfx.drawRect(0, 0, width, height);
            gfx.endFill();
            const texture = PIXI.RenderTexture.create(width, height);
            renderer.render(gfx, texture);
            const sprite = new PIXI.Sprite(texture);
            sprite.x = obj.x;
            sprite.y = obj.y;
            sprite.blendMode = config.stripeBlendMode;
            return sprite;
        }
        const mask = config.enableMask == true
            ? makeMaskSprite(config, board, renderer)
            : null;
        const talls = sequenceToShapes(widthSeq, (a,b) => {a.width = b;});
        const wides = sequenceToShapes(widthSeq, (a,b) => {a.height = b;});
        let leftCounter = board.left;
        let topCounter = board.top;
        const warpSprites = talls.map(s => {
            s.x = leftCounter;
            leftCounter += s.width;
            const sprite = mapSprite(s);
            return {sprite: sprite};
        });
        const weftSprites = wides.map(s => {
            s.y = topCounter;
            topCounter += s.height;
            const sprite = mapSprite(s);
            sprite.mask = mask;
            return {sprite: sprite};
        });
        let result = [];
        if(config.showWarp == true) { result = result.concat(warpSprites); }
        if(config.showWeft == true) { result = result.concat(weftSprites); }
        return result;
    }

    function animateShapes(shapes, board, config) {
        const timeline = anime.timeline({
            autoplay: false,
            loop: true,
            duration: 0,
        });
        const dummy = {x:0};
        for(let i = 0; i < shapes.length; i++) {
            const shape = shapes[i];
            // timeline.add({
            //     targets: shape.sprite.scale,
            //     x: shrinkAnimation,
            //     y: shrinkAnimation,
            //     easing: config.shrinkEasing,
            //     offset: offset,
            // });
        }
        // timeline.add({
        //     targets: dummy,
        //     x: 0,
        //     duration: config.cyclePause,
        // });
        return timeline;
    }

    return (function() {
        const config = getConfig();
        const mainel = document.getElementById("main");
        let app = new PIXI.Application({
            width: mainel.width,
            height: mainel.height,
            view: mainel,
            autoResize: true,
            antialias: true,
            autoStart: false,
        });
        app.renderer.backgroundColor = config.backgroundColor;
        app.renderer.render(app.stage);
        //note: this prevents ticker starting when a listener is added. not when the application starts.
        app.ticker.autoStart = false;
        app.ticker.stop();

        let board = makeBoardRectangle(config.screenMargin, app.screen);
        const shapes = makePattern(config, board, app.renderer);
        const background = makeBackground(config, app.screen, app.renderer);
        //const background = makeMaskSprite(config, board, app.renderer);
        //app.stage.addChild(background);
        for(let s of shapes) {
            app.stage.addChild(s.sprite);
        }
        //const animation = animateShapes(shapes, board, config);
        const animation = {};
        let state = {
            config: config,
            app: app,
            board: board,
            animation: animation,
            shapes: shapes,
            background: background,
        };
        return function(recorder) {
            state.recorder = recorder || {capture: function(){}};
            app.start();
            render(Date.now(), state);
            //animation.play();
            return state;
        }
    })();
})();

function getPatternStats() {
    const raw = [
        {"state":1,"transitions":[{"dest":1,"probability":0.55434782608695654},{"dest":2,"probability":0.16666666666666666},{"dest":3,"probability":0.072463768115942032},{"dest":4,"probability":0.039855072463768113},{"dest":5,"probability":0.028985507246376812},{"dest":6,"probability":0.014492753623188406},{"dest":7,"probability":0.010869565217391304},{"dest":8,"probability":0.010869565217391304},{"dest":9,"probability":0.0},{"dest":10,"probability":0.014492753623188406},{"dest":11,"probability":0.014492753623188406},{"dest":12,"probability":0.0},{"dest":13,"probability":0.010869565217391304},{"dest":14,"probability":0.007246376811594203},{"dest":15,"probability":0.007246376811594203},{"dest":16,"probability":0.018115942028985508},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.010869565217391304},{"dest":30,"probability":0.007246376811594203},{"dest":40,"probability":0.0},{"dest":50,"probability":0.010869565217391304},{"dest":60,"probability":0.0}]},
        {"state":2,"transitions":[{"dest":1,"probability":0.25},{"dest":2,"probability":0.30232558139534882},{"dest":3,"probability":0.093023255813953487},{"dest":4,"probability":0.034883720930232558},{"dest":5,"probability":0.046511627906976744},{"dest":6,"probability":0.029069767441860465},{"dest":7,"probability":0.029069767441860465},{"dest":8,"probability":0.011627906976744186},{"dest":9,"probability":0.017441860465116279},{"dest":10,"probability":0.023255813953488372},{"dest":11,"probability":0.0},{"dest":12,"probability":0.017441860465116279},{"dest":13,"probability":0.023255813953488372},{"dest":14,"probability":0.040697674418604654},{"dest":15,"probability":0.011627906976744186},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0058139534883720929},{"dest":18,"probability":0.011627906976744186},{"dest":19,"probability":0.0058139534883720929},{"dest":20,"probability":0.040697674418604654},{"dest":30,"probability":0.0058139534883720929},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":3,"transitions":[{"dest":1,"probability":0.16279069767441862},{"dest":2,"probability":0.10852713178294573},{"dest":3,"probability":0.17829457364341086},{"dest":4,"probability":0.054263565891472867},{"dest":5,"probability":0.054263565891472867},{"dest":6,"probability":0.031007751937984496},{"dest":7,"probability":0.015503875968992248},{"dest":8,"probability":0.0077519379844961239},{"dest":9,"probability":0.0077519379844961239},{"dest":10,"probability":0.015503875968992248},{"dest":11,"probability":0.069767441860465115},{"dest":12,"probability":0.0077519379844961239},{"dest":13,"probability":0.03875968992248062},{"dest":14,"probability":0.0077519379844961239},{"dest":15,"probability":0.015503875968992248},{"dest":16,"probability":0.015503875968992248},{"dest":17,"probability":0.062015503875968991},{"dest":18,"probability":0.031007751937984496},{"dest":19,"probability":0.0077519379844961239},{"dest":20,"probability":0.069767441860465115},{"dest":30,"probability":0.031007751937984496},{"dest":40,"probability":0.0077519379844961239},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":4,"transitions":[{"dest":1,"probability":0.16666666666666666},{"dest":2,"probability":0.092592592592592587},{"dest":3,"probability":0.12962962962962962},{"dest":4,"probability":0.1111111111111111},{"dest":5,"probability":0.018518518518518517},{"dest":6,"probability":0.037037037037037035},{"dest":7,"probability":0.018518518518518517},{"dest":8,"probability":0.018518518518518517},{"dest":9,"probability":0.018518518518518517},{"dest":10,"probability":0.037037037037037035},{"dest":11,"probability":0.018518518518518517},{"dest":12,"probability":0.055555555555555552},{"dest":13,"probability":0.018518518518518517},{"dest":14,"probability":0.037037037037037035},{"dest":15,"probability":0.0},{"dest":16,"probability":0.018518518518518517},{"dest":17,"probability":0.018518518518518517},{"dest":18,"probability":0.018518518518518517},{"dest":19,"probability":0.0},{"dest":20,"probability":0.055555555555555552},{"dest":30,"probability":0.092592592592592587},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.018518518518518517}]},
        {"state":5,"transitions":[{"dest":1,"probability":0.18181818181818182},{"dest":2,"probability":0.22727272727272727},{"dest":3,"probability":0.18181818181818182},{"dest":4,"probability":0.022727272727272728},{"dest":5,"probability":0.068181818181818177},{"dest":6,"probability":0.045454545454545456},{"dest":7,"probability":0.0},{"dest":8,"probability":0.045454545454545456},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.022727272727272728},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.068181818181818177},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.068181818181818177},{"dest":30,"probability":0.0},{"dest":40,"probability":0.022727272727272728},{"dest":50,"probability":0.045454545454545456},{"dest":60,"probability":0.0}]},
        {"state":6,"transitions":[{"dest":1,"probability":0.12820512820512819},{"dest":2,"probability":0.12820512820512819},{"dest":3,"probability":0.17948717948717949},{"dest":4,"probability":0.05128205128205128},{"dest":5,"probability":0.02564102564102564},{"dest":6,"probability":0.15384615384615385},{"dest":7,"probability":0.05128205128205128},{"dest":8,"probability":0.05128205128205128},{"dest":9,"probability":0.02564102564102564},{"dest":10,"probability":0.0},{"dest":11,"probability":0.02564102564102564},{"dest":12,"probability":0.02564102564102564},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.02564102564102564},{"dest":18,"probability":0.0},{"dest":19,"probability":0.02564102564102564},{"dest":20,"probability":0.10256410256410256},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":7,"transitions":[{"dest":1,"probability":0.19047619047619047},{"dest":2,"probability":0.23809523809523808},{"dest":3,"probability":0.14285714285714285},{"dest":4,"probability":0.047619047619047616},{"dest":5,"probability":0.047619047619047616},{"dest":6,"probability":0.047619047619047616},{"dest":7,"probability":0.047619047619047616},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.047619047619047616},{"dest":13,"probability":0.047619047619047616},{"dest":14,"probability":0.047619047619047616},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.095238095238095233},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":8,"transitions":[{"dest":1,"probability":0.26315789473684209},{"dest":2,"probability":0.052631578947368418},{"dest":3,"probability":0.0},{"dest":4,"probability":0.052631578947368418},{"dest":5,"probability":0.052631578947368418},{"dest":6,"probability":0.052631578947368418},{"dest":7,"probability":0.0},{"dest":8,"probability":0.10526315789473684},{"dest":9,"probability":0.0},{"dest":10,"probability":0.10526315789473684},{"dest":11,"probability":0.0},{"dest":12,"probability":0.052631578947368418},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.052631578947368418},{"dest":20,"probability":0.052631578947368418},{"dest":30,"probability":0.052631578947368418},{"dest":40,"probability":0.052631578947368418},{"dest":50,"probability":0.052631578947368418},{"dest":60,"probability":0.0}]},
        {"state":9,"transitions":[{"dest":1,"probability":0.125},{"dest":2,"probability":0.375},{"dest":3,"probability":0.375},{"dest":4,"probability":0.0},{"dest":5,"probability":0.0},{"dest":6,"probability":0.125},{"dest":7,"probability":0.0},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.0},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":10,"transitions":[{"dest":1,"probability":0.1875},{"dest":2,"probability":0.25},{"dest":3,"probability":0.1875},{"dest":4,"probability":0.0625},{"dest":5,"probability":0.0},{"dest":6,"probability":0.0},{"dest":7,"probability":0.0},{"dest":8,"probability":0.125},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0625},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0625},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0625},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.0},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":11,"transitions":[{"dest":1,"probability":0.11764705882352941},{"dest":2,"probability":0.0},{"dest":3,"probability":0.6470588235294118},{"dest":4,"probability":0.11764705882352941},{"dest":5,"probability":0.0},{"dest":6,"probability":0.058823529411764705},{"dest":7,"probability":0.0},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.058823529411764705},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.0},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":12,"transitions":[{"dest":1,"probability":0.0},{"dest":2,"probability":0.15384615384615385},{"dest":3,"probability":0.0},{"dest":4,"probability":0.30769230769230771},{"dest":5,"probability":0.076923076923076927},{"dest":6,"probability":0.0},{"dest":7,"probability":0.076923076923076927},{"dest":8,"probability":0.076923076923076927},{"dest":9,"probability":0.076923076923076927},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.15384615384615385},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.076923076923076927},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":13,"transitions":[{"dest":1,"probability":0.13043478260869565},{"dest":2,"probability":0.17391304347826086},{"dest":3,"probability":0.17391304347826086},{"dest":4,"probability":0.043478260869565216},{"dest":5,"probability":0.043478260869565216},{"dest":6,"probability":0.043478260869565216},{"dest":7,"probability":0.043478260869565216},{"dest":8,"probability":0.0},{"dest":9,"probability":0.043478260869565216},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.13043478260869565},{"dest":14,"probability":0.13043478260869565},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.043478260869565216},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":14,"transitions":[{"dest":1,"probability":0.083333333333333329},{"dest":2,"probability":0.25},{"dest":3,"probability":0.083333333333333329},{"dest":4,"probability":0.041666666666666664},{"dest":5,"probability":0.041666666666666664},{"dest":6,"probability":0.0},{"dest":7,"probability":0.0},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.125},{"dest":14,"probability":0.20833333333333334},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.041666666666666664},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.083333333333333329},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.041666666666666664},{"dest":60,"probability":0.0}]},
        {"state":15,"transitions":[{"dest":1,"probability":0.18181818181818182},{"dest":2,"probability":0.090909090909090912},{"dest":3,"probability":0.18181818181818182},{"dest":4,"probability":0.0},{"dest":5,"probability":0.0},{"dest":6,"probability":0.0},{"dest":7,"probability":0.0},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.090909090909090912},{"dest":14,"probability":0.0},{"dest":15,"probability":0.36363636363636365},{"dest":16,"probability":0.090909090909090912},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.0},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":16,"transitions":[{"dest":1,"probability":0.29411764705882354},{"dest":2,"probability":0.058823529411764705},{"dest":3,"probability":0.058823529411764705},{"dest":4,"probability":0.0},{"dest":5,"probability":0.17647058823529413},{"dest":6,"probability":0.0},{"dest":7,"probability":0.0},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.058823529411764705},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.058823529411764705},{"dest":16,"probability":0.23529411764705882},{"dest":17,"probability":0.0},{"dest":18,"probability":0.058823529411764705},{"dest":19,"probability":0.0},{"dest":20,"probability":0.0},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":17,"transitions":[{"dest":1,"probability":0.0},{"dest":2,"probability":0.14285714285714285},{"dest":3,"probability":0.5},{"dest":4,"probability":0.0},{"dest":5,"probability":0.0},{"dest":6,"probability":0.071428571428571425},{"dest":7,"probability":0.0},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.071428571428571425},{"dest":11,"probability":0.071428571428571425},{"dest":12,"probability":0.0},{"dest":13,"probability":0.071428571428571425},{"dest":14,"probability":0.071428571428571425},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.0},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":18,"transitions":[{"dest":1,"probability":0.0},{"dest":2,"probability":0.33333333333333331},{"dest":3,"probability":0.33333333333333331},{"dest":4,"probability":0.0},{"dest":5,"probability":0.0},{"dest":6,"probability":0.0},{"dest":7,"probability":0.0},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.1111111111111111},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.1111111111111111},{"dest":20,"probability":0.0},{"dest":30,"probability":0.1111111111111111},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":19,"transitions":[{"dest":1,"probability":0.2},{"dest":2,"probability":0.0},{"dest":3,"probability":0.4},{"dest":4,"probability":0.0},{"dest":5,"probability":0.0},{"dest":6,"probability":0.0},{"dest":7,"probability":0.0},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.4},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":20,"transitions":[{"dest":1,"probability":0.11627906976744186},{"dest":2,"probability":0.16279069767441862},{"dest":3,"probability":0.093023255813953487},{"dest":4,"probability":0.13953488372093023},{"dest":5,"probability":0.093023255813953487},{"dest":6,"probability":0.16279069767441862},{"dest":7,"probability":0.069767441860465115},{"dest":8,"probability":0.023255813953488372},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.023255813953488372},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.023255813953488372},{"dest":19,"probability":0.0},{"dest":20,"probability":0.069767441860465115},{"dest":30,"probability":0.023255813953488372},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":30,"transitions":[{"dest":1,"probability":0.15789473684210525},{"dest":2,"probability":0.052631578947368418},{"dest":3,"probability":0.10526315789473684},{"dest":4,"probability":0.15789473684210525},{"dest":5,"probability":0.10526315789473684},{"dest":6,"probability":0.10526315789473684},{"dest":7,"probability":0.052631578947368418},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.052631578947368418},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.052631578947368418},{"dest":30,"probability":0.15789473684210525},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":40,"transitions":[{"dest":1,"probability":0.0},{"dest":2,"probability":0.0},{"dest":3,"probability":0.0},{"dest":4,"probability":0.0},{"dest":5,"probability":0.0},{"dest":6,"probability":0.0},{"dest":7,"probability":0.0},{"dest":8,"probability":0.5},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.25},{"dest":30,"probability":0.0},{"dest":40,"probability":0.25},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":50,"transitions":[{"dest":1,"probability":0.14285714285714285},{"dest":2,"probability":0.0},{"dest":3,"probability":0.14285714285714285},{"dest":4,"probability":0.0},{"dest":5,"probability":0.2857142857142857},{"dest":6,"probability":0.14285714285714285},{"dest":7,"probability":0.14285714285714285},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.0},{"dest":30,"probability":0.14285714285714285},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]},
        {"state":60,"transitions":[{"dest":1,"probability":0.0},{"dest":2,"probability":0.0},{"dest":3,"probability":0.0},{"dest":4,"probability":1.0},{"dest":5,"probability":0.0},{"dest":6,"probability":0.0},{"dest":7,"probability":0.0},{"dest":8,"probability":0.0},{"dest":9,"probability":0.0},{"dest":10,"probability":0.0},{"dest":11,"probability":0.0},{"dest":12,"probability":0.0},{"dest":13,"probability":0.0},{"dest":14,"probability":0.0},{"dest":15,"probability":0.0},{"dest":16,"probability":0.0},{"dest":17,"probability":0.0},{"dest":18,"probability":0.0},{"dest":19,"probability":0.0},{"dest":20,"probability":0.0},{"dest":30,"probability":0.0},{"dest":40,"probability":0.0},{"dest":50,"probability":0.0},{"dest":60,"probability":0.0}]}
    ];
    //return raw;
    const result = [];
    for(let stat of raw) {
        result[stat.state] = {state: stat.state, transitions: stat.transitions};
    }
    return result;
}