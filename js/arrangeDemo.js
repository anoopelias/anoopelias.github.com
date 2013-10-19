
(function($) {
    var surface;
    var pn;
    var cn;
    $(document).ready( function() {
        surface = SVG('surface').size(600, 500);
        $('#gen').click(genRandom);

        var p = {};
        p.x = 70;
        p.y = 70;
        plotpoint(p);
        
        p.x = 300;
        p.y = 270;
        plotpoint(p);
    });

    var plotpoint = function(p) {
        surface.circle(6).attr({fill: '#000'}).move(p.x, p.y);
    };

    var genRandom = function(e) {
        if(validate()) {
            console.log('validation pass');
        } else {
            message('Validation Error', 'Invalid Inputs');
        }
    };

    var validate = function() {
        pn = +($('#pn').val());
        cn = +($('#cn').val());

        if(isNaN(pn))
            return false;
        if(isNaN(cn))
            return false;
        
        if(pn <=0)
            return false;
        if(cn <=0 || cn > (pn * pn))
            return false;

        return true;
    };

    var message = function(title, message) {
       $('#messageModalTitle').html(title);
       $('#messageModalBody').html(message);
       $('#messageModal').modal(); 
    }

    var surface = {};

    surface.plotRandom = function(pn, cn) {
    }


}(jQuery));
