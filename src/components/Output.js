/* global Blob */

import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Button, Panel } from 'react-bootstrap'

import JSZip from 'jszip'

import { saveAs } from 'file-saver'

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import codeStyle from 'react-syntax-highlighter/dist/languages/hljs/json'
import defaultStyle from 'react-syntax-highlighter/dist/styles/hljs/default-style'

import CraftingGenerator from '../classes/CraftingGenerator'

import './Output.css'

// register the language
SyntaxHighlighter.registerLanguage('json', codeStyle)

class Output extends Component {
  constructor (props) {
    super(props)

    this.generateCraftingName = this.generateCraftingName.bind(this)
    this.generateCrafting = this.generateCrafting.bind(this)
    this.generateTags = this.generateTags.bind(this)
    this.generateDatapack = this.generateDatapack.bind(this)
  }

  generateCraftingName () {
    const { outputRecipe } = this.props

    return (outputRecipe || 'crafting_recipe') + '.json'
  }

  generateCrafting () {
    const { input, output, group, furnace, generic, emptySpace, shape, tab, tags } = this.props
    let json, generator
    if (tab === 'crafting') {
      generator = new CraftingGenerator(input, output, tags, { group })
      if (shape === 'shapeless') {
        json = generator.shapeless()
      } else {
        json = generator.shaped(emptySpace)
      }
    } else if (['furnace', 'blast', 'campfire', 'smoking'].includes(tab)) {
      generator = new CraftingGenerator(furnace.input, output, tags, { group })
      json = generator.cooking(furnace.cookingTime, furnace.experience, tab)
    } else if (['stonecutter'].includes(tab)) {
      generator = new CraftingGenerator(generic.input, output, tags, { group })
      json = generator.generic(tab)
    }

    if (json && json.result && json.result.item) {
      json.result.count = output.count
    }
    return json
  }

  generateTags () {
    let { tags = [] } = this.props
    const downloadableTags = Object.keys(tags)
      .filter(tag => tags[tag].asTag)
      .filter(tag => tags[tag].namespace !== 'minecraft') // ignore minecraft ones

    return downloadableTags.map((tag) => ({
      namespace: tags[tag].namespace,
      name: tags[tag].name,
      data: {
        replace: false,
        values: tags[tag].items.map((item) => item.id)
      }
    }))
  }

  generateDatapack () {
    const craftingRecipe = this.generateCrafting()
    const craftingName = this.generateCraftingName()
    const tags = this.generateTags()

    let zip = new JSZip()
    // add the pack file
    zip.file('pack.mcmeta', JSON.stringify({
      pack: {
        pack_format: 1,
        description: 'Generated with TheDestruc7i0n\'s crafting generator: https://crafting.thedestruc7i0n.ca'
      }
    }))
    // add the crafting recipe
    zip.file(`data/crafting/recipes/${craftingName}`, JSON.stringify(craftingRecipe, null, 4))
    // add all the tags
    tags.forEach(({ namespace, name, data }) => {
      zip.file(`data/${namespace}/tags/items/${name}.json`, JSON.stringify(data, null, 4))
    })
    // generate and download
    zip.generateAsync({ type: 'blob' })
      .then((content) => saveAs(content, `datapack.zip`))
  }

  render () {
    const fileSaveName = this.generateCraftingName()
    const json = this.generateCrafting() || {}

    let toCopy = JSON.stringify(json, null, 4)
    let blob = new Blob([toCopy], { type: 'text/plain;charset=utf-8' })

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title>
            JSON
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <SyntaxHighlighter
            style={defaultStyle}
          >{toCopy}</SyntaxHighlighter>

          <Button
            onClick={() => saveAs(blob, fileSaveName)}
            className='download-button'
            bsStyle='primary'
            block
          >Download <code>{fileSaveName}</code></Button>
          <Button
            onClick={() => this.generateDatapack()}
            className='download-button'
            bsStyle='primary'
            block
          >Download <code>datapack.zip</code></Button>
        </Panel.Body>
      </Panel>
    )
  }
}

export default connect((store) => {
  return {
    input: store.Data.crafting,
    output: store.Data.output,
    group: store.Data.group,
    furnace: store.Data.furnace,
    generic: store.Data.generic,
    tags: store.Data.tags,

    tab: store.Options.tab,
    shape: store.Options.shape,
    emptySpace: store.Options.emptySpace,
    outputRecipe: store.Options.outputRecipe
  }
})(Output)
