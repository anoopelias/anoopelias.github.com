var arrange = (function() {
    var arrange = {};

    arrange.arrange = function(points, positions) {
        var map = toMap(points, positions);
        var en = energy(points, positions);

        // Gradient Decent
        for(var i=0; i<20; i++) {
            var newMap = randomNeighbor(points, map);
            var newPositions = toPositions(points, newMap);
            var newEnergy = energy(points, newPositions);

            console.log(i + " : " + newEnergy);

            if(newEnergy < en) {
                en = newEnergy;
                map = newMap;
                positions = newPositions;
            }
        }
        
        return positions;
    };

    var energy = function(points, positions) {
        var totDist = 0.0;
        var totPointsOnLine = 0;
        for(var i=0; i<points.c.length; i++) {
            var conn = points.c[i];

            var line = {};
            line.from = positions[conn.from];
            line.to = positions[conn.to];

            var dist = Math.sqrt(
                Math.pow((line.to.x - line.from.x), 2) +
                Math.pow((line.to.y - line.from.y), 2) 
            );

            var noPointsOnLine = pointsOnLine(positions, line);

            totDist += dist;
            totPointsOnLine += noPointsOnLine;
        }

        // TODO: Assign weight to distance and points on line
        return totDist + totPointsOnLine;
    };

    var randomNeighbor = function(points, map) {

        // Random pos
        var randP = Math.floor(Math.random() * grid.N);

        // Random direction
        var randD = Math.floor(Math.random() * 4);

        // copy to new map
        var newMap = new Array(grid.N);
        for(var i=0; i< grid.N; i++) {
            newMap[i] = new Array(grid.N);
            for(var j=0; j<grid.N; j++) {
                newMap[i][j] = map[i][j];
            }
        }
        map = newMap;

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

        // Mapping
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

    var pointsOnLine = function(positions, line) {
        var cnt = 0;

        for (var i=0; i<positions.length; i++) {
            if (isPointOnLine(positions[i], line))
                cnt++;
        }

        return cnt;
    };

    var isPointOnLine = function(point, line) {
        var crossProduct = (line.from.y - line.to.y) * (point.x - line.to.x)
            - (line.from.x - line.to.x) * (point.y - line.to.y);

        if (crossProduct !=0 )
            return false;

        if (!isBetween(point.x, line.from.x, line.to.x))
            return false;

        if (!isBetween(point.y, line.from.y, line.to.y))
            return false;

        return true;

    };

    var isBetween = function(x, a, b) {
        if(a < b) {
            if (!(x>a && x<b))
                return false;
        } else if (b < a) {
            if (!(x>b && x<a))
                return false;
        } else if(a === b) {
            if (!(a===x))
                return false;
        }

        return true;

    };

    return arrange;

})();
