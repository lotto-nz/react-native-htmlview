var React = require('react')
var ReactNative = require('react-native')
var htmlparser = require('./vendor/htmlparser2')
var entities = require('./vendor/entities')

var {
    Dimensions,
    Text,
    View
} = ReactNative

var Image = require('./helper/Image')

const {width} = Dimensions.get('window')

var LINE_BREAK = '\n'
var BULLET = '\u2022 '
var LIST_INDEX = 1
var LIST_RESET = 1

function htmlToElement(rawHtml, opts, done) {

    LIST_INDEX = LIST_RESET

    function domToElement(dom, parent) {
        if (!dom) return null

        return dom.map((node, index, list) => {
            if (opts.customRenderer) {
                var rendered = opts.customRenderer(node, index, list)
                if (rendered || rendered === null) return rendered
            }

            if (node.type == 'text') {

                return (
                    <Text
                        key={index}
                        style={[
                            parent ? inheritedStyle(parent) : null,
                            parent && parent.name === 'a' ? {color: '#0069a2'} : null,
                            parent && parent.name === 'strong' ? {fontWeight: '500'} : null
                        ]}>
                        {entities.decodeHTML(node.data)}
                    </Text>
                )
            }

            if (node.type == 'tag') {
                if (node.name == 'img') {
                    var img_w = +node.attribs['width'] || +node.attribs['data-width'] || 0
                    var img_h = +node.attribs['height'] || +node.attribs['data-height'] || 0

                    var img_style = {
                        width: img_w,
                        height: img_h,
                    }
                    var source = {
                        uri: node.attribs.src,
                        width: img_w,
                        height: img_h,
                    }
                    return (
                        <Image key={index} source={source} style={img_style} />
                    )
                }

                if (node.name == 'table' || node.name == 'tbody' || node.name == 'thead') {

                    node.children.data = '' // trim tabs from WYSIWYG

                    return (
                        <View key={index}>
                            {domToElement(node.children,node)}
                        </View>
                    )
                }

                if (node.name == 'tr') {

                    return (
                        <View
                            key={index}
                            style={{backgroundColor: 'rgba(0, 0, 0, .1)', flexDirection: 'row', marginTop: 1}}>
                            {domToElement(node.children,node)}
                        </View>
                    )
                }

                if (node.name == 'td' || node.name == 'th') {

                    return (
                        <View
                            key={index}
                            style={{padding: 3, flex: 1}}>
                            {domToElement(node.children,node)}
                        </View>
                    )
                }

                var linkPressHandler = null
                if (node.name == 'a' && node.attribs && node.attribs.href) {
                    linkPressHandler = () => opts.linkHandler(entities.decodeHTML(node.attribs.href))
                }

                var p_style = {
                    lineHeight: 21
                }

                return (
                    <Text
                        key={index}
                        onPress={linkPressHandler}
                        style={[
                            {
                                marginBottom: getMargin(node.name),
                                marginTop: node.name == 'p' ? 0 : getMargin(node.name)
                            },
                            node.name == 'p' ? p_style : null
                        ]}>
                        {node.name == 'pre' ? LINE_BREAK : null}
                        {node.name == 'li' ? olUl(node) : null}
                        {domToElement(node.children,node)}
                        {node.name == 'li' ? LINE_BREAK : null}
                        {node.name == 'br' && index < list.length - 1 ? LINE_BREAK : null}
                    </Text>
                )
            }
        })
    }

    function getMargin(elName) {

        switch (elName) {
            case 'h1':
                return 16
            case 'h2':
                return 12
            case 'h3':
                return 9
            case 'h4':
                return 9
            case 'h5':
                return 7
            case 'p':
                return 7
            default:
                return 1
        }
    }

    function olUl(el) {

        var parentEl = el.parent
        var result = ''

        if (parentEl !== null) {

            if (parentEl.name === 'ol') {
                result = `${LIST_INDEX++}. `
            }
            else {
                result = BULLET
            }
        }

        return result
    }

    function inheritedStyle(parent) {
        var style = [opts.styles[parent.name] || {}];
        return parent.parent ? style.concat(inheritedStyle(parent.parent)) : style;
    }

    var handler = new htmlparser.DomHandler(function(err, dom) {
        if (err) done(err)
        done(null, domToElement(dom))
    })
    var parser = new htmlparser.Parser(handler)
    parser.write(rawHtml)
    parser.done()
}

module.exports = htmlToElement
