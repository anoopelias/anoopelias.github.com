var arrange = (function(arr) {

    arr.energy = function(points, positions) {
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

    return arr;

}(arrange || {}));
