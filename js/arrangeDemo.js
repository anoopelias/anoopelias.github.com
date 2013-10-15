
(function($) {
    var surface;
    $(document).ready( function() {
        surface = SVG('surface').size(600, 500);

        var p = {};
        p.x = 70;
        p.y = 70;
        plot(p);
        
        p.x = 300;
        p.y = 270;
        plot(p);
    });

    var plot = function(p) {
        surface.circle(6).attr({fill: '#000'}).move(p.x, p.y);
    };

}(jQuery));
