var arrange = (function() {
    var arrange = {};

    arrange.arrange = function(points, positions) {
        var map = toMap(points, positions);
        map = randomNeighbor(points, map);
        return toPositions(points, map);
    };

    var energy = function(points, map) {
        //TODO : Calculate Energy
    };

    var randomNeighbor = function(points, map) {

        // Random pos
        var randP = Math.floor(Math.random() * grid.N);

        // Random direction
        var randD = Math.floor(Math.random() * 4);

        console.log("P" + randP);
        console.log("D" + randD);

        // Moving column up
        if(randD === 0) {
            var tempPoint = map[randP][0];
            for(var i=1; i<grid.N; i++) {
                map[randP][i-1] = map[randP][i];
            }
            map[randP][grid.N - 1] = tempPoint;
        }

        // Moving column down
        if(randD === 2) {
            var tempPoint = map[randP][grid.N - 1];
            for(var i=grid.N - 1 ; i>0; i--) {
                map[randP][i] = map[randP][i - 1];
            }
            map[randP][0] = tempPoint;
        }
        
        // Moving row to left
        if(randD === 1) {
            var tempPoint = map[0][randP];
            for(var i=1 ; i<grid.N; i++) {
                map[i - 1][randP] = map[i][randP];
            }
            map[grid.N - 1][randP] = tempPoint;
        }

        // Moving row to right
        if(randD === 3) {
            var tempPoint = map[grid.N - 1][randP];
            for(var i=grid.N - 1 ; i>0; i--) {
                map[i][randP] = map[i - 1][randP];
            }
            map[0][randP] = tempPoint;
        }

        return map;
    };

    var toMap = function(points, positions) {

        // Initialize
        var map = new Array(grid.N);
        for(var i=0; i<grid.N; i++) {
            map[i] = new Array(grid.N);
        }

        for(var i=0; i<points.n; i++) {
            var pos = positions[i];
            map[pos.x][pos.y] = i;
        }
        
        return map;
    };

    var toPositions = function(points, map) {
        var positions = new Array(points.n);
        for(var i=0; i< grid.N; i++) {
           for(var j=0; j<grid.N; j++) {
               if(map[i][j] !== 'undefined') {
                   positions[map[i][j]] = {
                       x : i,
                       y : j
                   }

               }
           }
        }

        return positions;
    };

    return arrange;

})();
