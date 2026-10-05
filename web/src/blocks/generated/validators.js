// Généré par web/scripts/blocks-generate.mjs (npm run blocks:generate) depuis blocks/. Ne pas modifier.
var __getOwnPropNames = Object.getOwnPropertyNames
var __commonJS = (cb, mod) =>
  function __require() {
    try {
      return (
        mod ||
          (0, cb[__getOwnPropNames(cb)[0]])(
            (mod = { exports: {} }).exports,
            mod
          ),
        mod.exports
      )
    } catch (e) {
      throw ((mod = 0), e)
    }
  }

// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/ajv/dist/runtime/ucs2length.js"(exports) {
    "use strict"
    Object.defineProperty(exports, "__esModule", { value: true })
    function ucs2length(str) {
      const len = str.length
      let length = 0
      let pos = 0
      let value
      while (pos < len) {
        length++
        value = str.charCodeAt(pos++)
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos)
          if ((value & 64512) === 56320) pos++
        }
      }
      return length
    }
    exports.default = ucs2length
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default'
  },
})

// validators.raw.mjs
var validateDraft = validate10
var func2 = require_ucs2length().default
var schema12 = {
  $comment:
    "R\xE9f\xE9rence \xE0 un fichier de la m\xE9diath\xE8que (image de pr\xE9sentation, son d'un \xE9pisode), ou null. Toute r\xE9f\xE9rence de fichier s'appelle mediaId ([D9]).",
  type: ["object", "null"],
  additionalProperties: false,
  required: ["mediaId"],
  properties: { mediaId: { $ref: "#/definitions/uuid" } },
}
var pattern0 = new RegExp(
  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
  "u"
)
function validate11(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (
    !(data && typeof data == "object" && !Array.isArray(data)) &&
    data !== null
  ) {
    validate11.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: { type: schema12.type },
        message: "must be object,null",
      },
    ]
    return false
  }
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.mediaId === void 0 && (missing0 = "mediaId")) {
        validate11.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "mediaId")) {
            validate11.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.mediaId !== void 0) {
            let data0 = data.mediaId
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate11.errors = [
                    {
                      instancePath: instancePath + "/mediaId",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate11.errors = [
                  {
                    instancePath: instancePath + "/mediaId",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
          }
        }
      }
    }
  }
  validate11.errors = vErrors
  return errors === 0
}
var schema14 = {
  $comment: "Un bloc au premier niveau d'un brouillon de contenu.",
  tsType: "TextBlock | ImageBlock | BoxBlock | LinkedBlock",
  if: {
    type: "object",
    required: ["type"],
    properties: { type: { const: "text" } },
  },
  then: { $ref: "#/definitions/textBlock" },
  else: {
    if: {
      type: "object",
      required: ["type"],
      properties: { type: { const: "image" } },
    },
    then: { $ref: "#/definitions/imageBlock" },
    else: {
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "box" } },
      },
      then: { $ref: "#/definitions/boxBlock" },
      else: {
        if: {
          type: "object",
          required: ["type"],
          properties: { type: { const: "linked" } },
        },
        then: { $ref: "#/definitions/linkedBlock" },
        else: {
          type: "object",
          required: ["type"],
          properties: { type: { enum: ["text", "image", "box", "linked"] } },
        },
      },
    },
  },
}
var schema18 = {
  tsType: "Paragraph | Heading | BulletList | OrderedList",
  if: {
    type: "object",
    required: ["type"],
    properties: { type: { const: "paragraph" } },
  },
  then: { $ref: "#/definitions/paragraph" },
  else: {
    if: {
      type: "object",
      required: ["type"],
      properties: { type: { const: "heading" } },
    },
    then: { $ref: "#/definitions/heading" },
    else: {
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "bulletList" } },
      },
      then: { $ref: "#/definitions/bulletList" },
      else: {
        if: {
          type: "object",
          required: ["type"],
          properties: { type: { const: "orderedList" } },
        },
        then: { $ref: "#/definitions/orderedList" },
        else: {
          type: "object",
          required: ["type"],
          properties: {
            type: {
              enum: ["paragraph", "heading", "bulletList", "orderedList"],
            },
          },
        },
      },
    },
  },
}
var schema27 = {
  type: "object",
  additionalProperties: false,
  required: ["type"],
  properties: { type: { enum: ["bold", "italic"] } },
}
var pattern2 = new RegExp("^(https://|mailto:)[^\\s]+$", "u")
function validate24(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.attrs === void 0 && (missing0 = "attrs"))
      ) {
        validate24.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "attrs")) {
            validate24.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("link" !== data.type) {
              validate24.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "link" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.attrs !== void 0) {
              let data1 = data.attrs
              const _errs3 = errors
              if (errors === _errs3) {
                if (
                  data1 &&
                  typeof data1 == "object" &&
                  !Array.isArray(data1)
                ) {
                  let missing1
                  if (data1.href === void 0 && (missing1 = "href")) {
                    validate24.errors = [
                      {
                        instancePath: instancePath + "/attrs",
                        schemaPath: "#/properties/attrs/required",
                        keyword: "required",
                        params: { missingProperty: missing1 },
                        message:
                          "must have required property '" + missing1 + "'",
                      },
                    ]
                    return false
                  } else {
                    const _errs5 = errors
                    for (const key1 in data1) {
                      if (!(key1 === "href")) {
                        validate24.errors = [
                          {
                            instancePath: instancePath + "/attrs",
                            schemaPath:
                              "#/properties/attrs/additionalProperties",
                            keyword: "additionalProperties",
                            params: { additionalProperty: key1 },
                            message: "must NOT have additional properties",
                          },
                        ]
                        return false
                        break
                      }
                    }
                    if (_errs5 === errors) {
                      if (data1.href !== void 0) {
                        let data2 = data1.href
                        const _errs7 = errors
                        if (errors === _errs7) {
                          if (typeof data2 === "string") {
                            if (func2(data2) > 2048) {
                              validate24.errors = [
                                {
                                  instancePath: instancePath + "/attrs/href",
                                  schemaPath: "#/definitions/href/maxLength",
                                  keyword: "maxLength",
                                  params: { limit: 2048 },
                                  message:
                                    "must NOT have more than 2048 characters",
                                },
                              ]
                              return false
                            } else {
                              if (!pattern2.test(data2)) {
                                validate24.errors = [
                                  {
                                    instancePath: instancePath + "/attrs/href",
                                    schemaPath: "#/definitions/href/pattern",
                                    keyword: "pattern",
                                    params: {
                                      pattern: "^(https://|mailto:)[^\\s]+$",
                                    },
                                    message:
                                      'must match pattern "^(https://|mailto:)[^\\s]+$"',
                                  },
                                ]
                                return false
                              }
                            }
                          } else {
                            validate24.errors = [
                              {
                                instancePath: instancePath + "/attrs/href",
                                schemaPath: "#/definitions/href/type",
                                keyword: "type",
                                params: { type: "string" },
                                message: "must be string",
                              },
                            ]
                            return false
                          }
                        }
                      }
                    }
                  }
                } else {
                  validate24.errors = [
                    {
                      instancePath: instancePath + "/attrs",
                      schemaPath: "#/properties/attrs/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate24.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate24.errors = vErrors
  return errors === 0
}
function validate23(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("link" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate24(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate24.errors : vErrors.concat(validate24.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    if (errors === _errs6) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          validate23.errors = [
            {
              instancePath,
              schemaPath: "#/definitions/basicMark/required",
              keyword: "required",
              params: { missingProperty: missing1 },
              message: "must have required property '" + missing1 + "'",
            },
          ]
          return false
        } else {
          const _errs8 = errors
          for (const key0 in data) {
            if (!(key0 === "type")) {
              validate23.errors = [
                {
                  instancePath,
                  schemaPath: "#/definitions/basicMark/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key0 },
                  message: "must NOT have additional properties",
                },
              ]
              return false
              break
            }
          }
          if (_errs8 === errors) {
            if (data.type !== void 0) {
              let data1 = data.type
              if (!(data1 === "bold" || data1 === "italic")) {
                validate23.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/definitions/basicMark/properties/type/enum",
                    keyword: "enum",
                    params: { allowedValues: schema27.properties.type.enum },
                    message: "must be equal to one of the allowed values",
                  },
                ]
                return false
              }
            }
          }
        }
      } else {
        validate23.errors = [
          {
            instancePath,
            schemaPath: "#/definitions/basicMark/type",
            keyword: "type",
            params: { type: "object" },
            message: "must be object",
          },
        ]
        return false
      }
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err3 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
    }
    errors++
    validate23.errors = vErrors
    return false
  }
  validate23.errors = vErrors
  return errors === 0
}
function validate22(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (Array.isArray(data)) {
      var valid0 = true
      const len0 = data.length
      for (let i0 = 0; i0 < len0; i0++) {
        const _errs1 = errors
        if (
          !validate23(data[i0], {
            instancePath: instancePath + "/" + i0,
            parentData: data,
            parentDataProperty: i0,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate23.errors
              : vErrors.concat(validate23.errors)
          errors = vErrors.length
        }
        var valid0 = _errs1 === errors
        if (!valid0) {
          break
        }
      }
    } else {
      validate22.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        },
      ]
      return false
    }
  }
  validate22.errors = vErrors
  return errors === 0
}
function validate21(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.text === void 0 && (missing0 = "text"))
      ) {
        validate21.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "text" || key0 === "marks")) {
            validate21.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("text" !== data.type) {
              validate21.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "text" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.text !== void 0) {
              let data1 = data.text
              const _errs3 = errors
              if (errors === _errs3) {
                if (typeof data1 === "string") {
                  if (func2(data1) < 1) {
                    validate21.errors = [
                      {
                        instancePath: instancePath + "/text",
                        schemaPath: "#/properties/text/minLength",
                        keyword: "minLength",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 characters",
                      },
                    ]
                    return false
                  }
                } else {
                  validate21.errors = [
                    {
                      instancePath: instancePath + "/text",
                      schemaPath: "#/properties/text/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.marks !== void 0) {
                const _errs5 = errors
                if (
                  !validate22(data.marks, {
                    instancePath: instancePath + "/marks",
                    parentData: data,
                    parentDataProperty: "marks",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate22.errors
                      : vErrors.concat(validate22.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs5 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate21.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate21.errors = vErrors
  return errors === 0
}
function validate29(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        validate29.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "marks")) {
            validate29.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("hardBreak" !== data.type) {
              validate29.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "hardBreak" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.marks !== void 0) {
              const _errs3 = errors
              if (
                !validate22(data.marks, {
                  instancePath: instancePath + "/marks",
                  parentData: data,
                  parentDataProperty: "marks",
                  rootData,
                })
              ) {
                vErrors =
                  vErrors === null
                    ? validate22.errors
                    : vErrors.concat(validate22.errors)
                errors = vErrors.length
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate29.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate29.errors = vErrors
  return errors === 0
}
function validate20(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate21(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate21.errors : vErrors.concat(validate21.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    if (
      !validate29(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate29.errors : vErrors.concat(validate29.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err3 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
    }
    errors++
    validate20.errors = vErrors
    return false
  }
  validate20.errors = vErrors
  return errors === 0
}
function validate19(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (Array.isArray(data)) {
      var valid0 = true
      const len0 = data.length
      for (let i0 = 0; i0 < len0; i0++) {
        const _errs1 = errors
        if (
          !validate20(data[i0], {
            instancePath: instancePath + "/" + i0,
            parentData: data,
            parentDataProperty: i0,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate20.errors
              : vErrors.concat(validate20.errors)
          errors = vErrors.length
        }
        var valid0 = _errs1 === errors
        if (!valid0) {
          break
        }
      }
    } else {
      validate19.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        },
      ]
      return false
    }
  }
  validate19.errors = vErrors
  return errors === 0
}
function validate18(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        validate18.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate18.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("paragraph" !== data.type) {
              validate18.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "paragraph" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              const _errs3 = errors
              if (
                !validate19(data.content, {
                  instancePath: instancePath + "/content",
                  parentData: data,
                  parentDataProperty: "content",
                  rootData,
                })
              ) {
                vErrors =
                  vErrors === null
                    ? validate19.errors
                    : vErrors.concat(validate19.errors)
                errors = vErrors.length
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate18.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate18.errors = vErrors
  return errors === 0
}
var schema29 = {
  $comment:
    "Niveaux 2 et 3 seulement : le titre du contenu fait office de niveau 1.",
  type: "object",
  additionalProperties: false,
  required: ["type", "attrs"],
  properties: {
    type: { const: "heading" },
    attrs: {
      type: "object",
      additionalProperties: false,
      required: ["level"],
      properties: { level: { enum: [2, 3] } },
    },
    content: { $ref: "#/definitions/inline" },
  },
}
function validate35(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.attrs === void 0 && (missing0 = "attrs"))
      ) {
        validate35.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "attrs" || key0 === "content")) {
            validate35.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("heading" !== data.type) {
              validate35.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "heading" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.attrs !== void 0) {
              let data1 = data.attrs
              const _errs4 = errors
              if (errors === _errs4) {
                if (
                  data1 &&
                  typeof data1 == "object" &&
                  !Array.isArray(data1)
                ) {
                  let missing1
                  if (data1.level === void 0 && (missing1 = "level")) {
                    validate35.errors = [
                      {
                        instancePath: instancePath + "/attrs",
                        schemaPath: "#/properties/attrs/required",
                        keyword: "required",
                        params: { missingProperty: missing1 },
                        message:
                          "must have required property '" + missing1 + "'",
                      },
                    ]
                    return false
                  } else {
                    const _errs6 = errors
                    for (const key1 in data1) {
                      if (!(key1 === "level")) {
                        validate35.errors = [
                          {
                            instancePath: instancePath + "/attrs",
                            schemaPath:
                              "#/properties/attrs/additionalProperties",
                            keyword: "additionalProperties",
                            params: { additionalProperty: key1 },
                            message: "must NOT have additional properties",
                          },
                        ]
                        return false
                        break
                      }
                    }
                    if (_errs6 === errors) {
                      if (data1.level !== void 0) {
                        let data2 = data1.level
                        if (!(data2 === 2 || data2 === 3)) {
                          validate35.errors = [
                            {
                              instancePath: instancePath + "/attrs/level",
                              schemaPath:
                                "#/properties/attrs/properties/level/enum",
                              keyword: "enum",
                              params: {
                                allowedValues:
                                  schema29.properties.attrs.properties.level
                                    .enum,
                              },
                              message:
                                "must be equal to one of the allowed values",
                            },
                          ]
                          return false
                        }
                      }
                    }
                  }
                } else {
                  validate35.errors = [
                    {
                      instancePath: instancePath + "/attrs",
                      schemaPath: "#/properties/attrs/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.content !== void 0) {
                const _errs8 = errors
                if (
                  !validate19(data.content, {
                    instancePath: instancePath + "/content",
                    parentData: data,
                    parentDataProperty: "content",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate19.errors
                      : vErrors.concat(validate19.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate35.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate35.errors = vErrors
  return errors === 0
}
var schema32 = {
  tsType: "Paragraph | BulletList | OrderedList",
  if: {
    type: "object",
    required: ["type"],
    properties: { type: { const: "paragraph" } },
  },
  then: { $ref: "#/definitions/paragraph" },
  else: {
    if: {
      type: "object",
      required: ["type"],
      properties: { type: { const: "bulletList" } },
    },
    then: { $ref: "#/definitions/bulletList" },
    else: {
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "orderedList" } },
      },
      then: { $ref: "#/definitions/orderedList" },
      else: {
        type: "object",
        required: ["type"],
        properties: {
          type: { enum: ["paragraph", "bulletList", "orderedList"] },
        },
      },
    },
  },
}
var wrapper1 = { validate: validate39 }
function validate42(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate42.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "attrs" || key0 === "content")) {
            validate42.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("orderedList" !== data.type) {
              validate42.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "orderedList" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.attrs !== void 0) {
              let data1 = data.attrs
              const _errs4 = errors
              if (errors === _errs4) {
                if (
                  data1 &&
                  typeof data1 == "object" &&
                  !Array.isArray(data1)
                ) {
                  const _errs6 = errors
                  for (const key1 in data1) {
                    if (!(key1 === "start")) {
                      validate42.errors = [
                        {
                          instancePath: instancePath + "/attrs",
                          schemaPath: "#/properties/attrs/additionalProperties",
                          keyword: "additionalProperties",
                          params: { additionalProperty: key1 },
                          message: "must NOT have additional properties",
                        },
                      ]
                      return false
                      break
                    }
                  }
                  if (_errs6 === errors) {
                    if (data1.start !== void 0) {
                      let data2 = data1.start
                      const _errs7 = errors
                      if (!(
                        typeof data2 == "number" &&
                        !(data2 % 1) &&
                        !isNaN(data2) &&
                        isFinite(data2)
                      )) {
                        validate42.errors = [
                          {
                            instancePath: instancePath + "/attrs/start",
                            schemaPath:
                              "#/properties/attrs/properties/start/type",
                            keyword: "type",
                            params: { type: "integer" },
                            message: "must be integer",
                          },
                        ]
                        return false
                      }
                      if (errors === _errs7) {
                        if (typeof data2 == "number" && isFinite(data2)) {
                          if (data2 > 99999 || isNaN(data2)) {
                            validate42.errors = [
                              {
                                instancePath: instancePath + "/attrs/start",
                                schemaPath:
                                  "#/properties/attrs/properties/start/maximum",
                                keyword: "maximum",
                                params: { comparison: "<=", limit: 99999 },
                                message: "must be <= 99999",
                              },
                            ]
                            return false
                          } else {
                            if (data2 < 1 || isNaN(data2)) {
                              validate42.errors = [
                                {
                                  instancePath: instancePath + "/attrs/start",
                                  schemaPath:
                                    "#/properties/attrs/properties/start/minimum",
                                  keyword: "minimum",
                                  params: { comparison: ">=", limit: 1 },
                                  message: "must be >= 1",
                                },
                              ]
                              return false
                            }
                          }
                        }
                      }
                    }
                  }
                } else {
                  validate42.errors = [
                    {
                      instancePath: instancePath + "/attrs",
                      schemaPath: "#/properties/attrs/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.content !== void 0) {
                let data3 = data.content
                const _errs9 = errors
                if (errors === _errs9) {
                  if (Array.isArray(data3)) {
                    if (data3.length < 1) {
                      validate42.errors = [
                        {
                          instancePath: instancePath + "/content",
                          schemaPath: "#/properties/content/minItems",
                          keyword: "minItems",
                          params: { limit: 1 },
                          message: "must NOT have fewer than 1 items",
                        },
                      ]
                      return false
                    } else {
                      var valid2 = true
                      const len0 = data3.length
                      for (let i0 = 0; i0 < len0; i0++) {
                        const _errs11 = errors
                        if (
                          !wrapper1.validate(data3[i0], {
                            instancePath: instancePath + "/content/" + i0,
                            parentData: data3,
                            parentDataProperty: i0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? wrapper1.validate.errors
                              : vErrors.concat(wrapper1.validate.errors)
                          errors = vErrors.length
                        }
                        var valid2 = _errs11 === errors
                        if (!valid2) {
                          break
                        }
                      }
                    }
                  } else {
                    validate42.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/type",
                        keyword: "type",
                        params: { type: "array" },
                        message: "must be array",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs9 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate42.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate42.errors = vErrors
  return errors === 0
}
var wrapper0 = { validate: validate38 }
function validate40(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("paragraph" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate18(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate18.errors : vErrors.concat(validate18.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    let valid2 = true
    const _errs7 = errors
    if (errors === _errs7) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("bulletList" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs7 === errors
    errors = _errs6
    if (vErrors !== null) {
      if (_errs6) {
        vErrors.length = _errs6
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs10 = errors
      if (
        !wrapper0.validate(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? wrapper0.validate.errors
            : vErrors.concat(wrapper0.validate.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs10 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs11 = errors
      const _errs12 = errors
      let valid4 = true
      const _errs13 = errors
      if (errors === _errs13) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("orderedList" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs13 === errors
      errors = _errs12
      if (vErrors !== null) {
        if (_errs12) {
          vErrors.length = _errs12
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs16 = errors
        if (
          !validate42(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate42.errors
              : vErrors.concat(validate42.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs16 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs17 = errors
        if (errors === _errs17) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              validate40.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/required",
                  keyword: "required",
                  params: { missingProperty: missing3 },
                  message: "must have required property '" + missing3 + "'",
                },
              ]
              return false
            } else {
              if (data.type !== void 0) {
                let data3 = data.type
                if (!(
                  data3 === "paragraph" ||
                  data3 === "bulletList" ||
                  data3 === "orderedList"
                )) {
                  validate40.errors = [
                    {
                      instancePath: instancePath + "/type",
                      schemaPath: "#/else/else/else/properties/type/enum",
                      keyword: "enum",
                      params: {
                        allowedValues:
                          schema32.else.else.else.properties.type.enum,
                      },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
              }
            }
          } else {
            validate40.errors = [
              {
                instancePath,
                schemaPath: "#/else/else/else/type",
                keyword: "type",
                params: { type: "object" },
                message: "must be object",
              },
            ]
            return false
          }
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err9 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
        validate40.errors = vErrors
        return false
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err10 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
      validate40.errors = vErrors
      return false
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err11 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err11]
    } else {
      vErrors.push(err11)
    }
    errors++
    validate40.errors = vErrors
    return false
  }
  validate40.errors = vErrors
  return errors === 0
}
function validate39(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate39.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate39.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("listItem" !== data.type) {
              validate39.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "listItem" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              let data1 = data.content
              const _errs4 = errors
              if (errors === _errs4) {
                if (Array.isArray(data1)) {
                  if (data1.length < 1) {
                    validate39.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/minItems",
                        keyword: "minItems",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 items",
                      },
                    ]
                    return false
                  } else {
                    const len0 = data1.length
                    var valid1 = len0 <= 1
                    if (!valid1) {
                      for (let i0 = 1; i0 < len0; i0++) {
                        const _errs6 = errors
                        if (
                          !validate40(data1[i0], {
                            instancePath: instancePath + "/content/" + i0,
                            parentData: data1,
                            parentDataProperty: i0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validate40.errors
                              : vErrors.concat(validate40.errors)
                          errors = vErrors.length
                        }
                        var valid1 = _errs6 === errors
                        if (!valid1) {
                          break
                        }
                      }
                    }
                    if (valid1) {
                      const len1 = data1.length
                      if (len1 > 0) {
                        if (
                          !validate18(data1[0], {
                            instancePath: instancePath + "/content/0",
                            parentData: data1,
                            parentDataProperty: 0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validate18.errors
                              : vErrors.concat(validate18.errors)
                          errors = vErrors.length
                        }
                      }
                    }
                  }
                } else {
                  validate39.errors = [
                    {
                      instancePath: instancePath + "/content",
                      schemaPath: "#/properties/content/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate39.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate39.errors = vErrors
  return errors === 0
}
function validate38(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate38.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate38.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("bulletList" !== data.type) {
              validate38.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "bulletList" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              let data1 = data.content
              const _errs3 = errors
              if (errors === _errs3) {
                if (Array.isArray(data1)) {
                  if (data1.length < 1) {
                    validate38.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/minItems",
                        keyword: "minItems",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 items",
                      },
                    ]
                    return false
                  } else {
                    var valid1 = true
                    const len0 = data1.length
                    for (let i0 = 0; i0 < len0; i0++) {
                      const _errs5 = errors
                      if (
                        !validate39(data1[i0], {
                          instancePath: instancePath + "/content/" + i0,
                          parentData: data1,
                          parentDataProperty: i0,
                          rootData,
                        })
                      ) {
                        vErrors =
                          vErrors === null
                            ? validate39.errors
                            : vErrors.concat(validate39.errors)
                        errors = vErrors.length
                      }
                      var valid1 = _errs5 === errors
                      if (!valid1) {
                        break
                      }
                    }
                  }
                } else {
                  validate38.errors = [
                    {
                      instancePath: instancePath + "/content",
                      schemaPath: "#/properties/content/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate38.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate38.errors = vErrors
  return errors === 0
}
function validate17(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("paragraph" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate18(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate18.errors : vErrors.concat(validate18.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    let valid2 = true
    const _errs7 = errors
    if (errors === _errs7) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("heading" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs7 === errors
    errors = _errs6
    if (vErrors !== null) {
      if (_errs6) {
        vErrors.length = _errs6
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs10 = errors
      if (
        !validate35(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate35.errors
            : vErrors.concat(validate35.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs10 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs11 = errors
      const _errs12 = errors
      let valid4 = true
      const _errs13 = errors
      if (errors === _errs13) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("bulletList" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs13 === errors
      errors = _errs12
      if (vErrors !== null) {
        if (_errs12) {
          vErrors.length = _errs12
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs16 = errors
        if (
          !validate38(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate38.errors
              : vErrors.concat(validate38.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs16 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs17 = errors
        const _errs18 = errors
        let valid6 = true
        const _errs19 = errors
        if (errors === _errs19) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              const err9 = {}
              if (vErrors === null) {
                vErrors = [err9]
              } else {
                vErrors.push(err9)
              }
              errors++
            } else {
              if (data.type !== void 0) {
                if ("orderedList" !== data.type) {
                  const err10 = {}
                  if (vErrors === null) {
                    vErrors = [err10]
                  } else {
                    vErrors.push(err10)
                  }
                  errors++
                }
              }
            }
          } else {
            const err11 = {}
            if (vErrors === null) {
              vErrors = [err11]
            } else {
              vErrors.push(err11)
            }
            errors++
          }
        }
        var _valid3 = _errs19 === errors
        errors = _errs18
        if (vErrors !== null) {
          if (_errs18) {
            vErrors.length = _errs18
          } else {
            vErrors = null
          }
        }
        let ifClause3
        if (_valid3) {
          const _errs22 = errors
          if (
            !validate42(data, {
              instancePath,
              parentData,
              parentDataProperty,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate42.errors
                : vErrors.concat(validate42.errors)
            errors = vErrors.length
          }
          var _valid3 = _errs22 === errors
          valid6 = _valid3
          ifClause3 = "then"
        } else {
          const _errs23 = errors
          if (errors === _errs23) {
            if (data && typeof data == "object" && !Array.isArray(data)) {
              let missing4
              if (data.type === void 0 && (missing4 = "type")) {
                validate17.errors = [
                  {
                    instancePath,
                    schemaPath: "#/else/else/else/else/required",
                    keyword: "required",
                    params: { missingProperty: missing4 },
                    message: "must have required property '" + missing4 + "'",
                  },
                ]
                return false
              } else {
                if (data.type !== void 0) {
                  let data4 = data.type
                  if (!(
                    data4 === "paragraph" ||
                    data4 === "heading" ||
                    data4 === "bulletList" ||
                    data4 === "orderedList"
                  )) {
                    validate17.errors = [
                      {
                        instancePath: instancePath + "/type",
                        schemaPath:
                          "#/else/else/else/else/properties/type/enum",
                        keyword: "enum",
                        params: {
                          allowedValues:
                            schema18.else.else.else.else.properties.type.enum,
                        },
                        message: "must be equal to one of the allowed values",
                      },
                    ]
                    return false
                  }
                }
              }
            } else {
              validate17.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/else/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                },
              ]
              return false
            }
          }
          var _valid3 = _errs23 === errors
          valid6 = _valid3
          ifClause3 = "else"
        }
        if (!valid6) {
          const err12 = {
            instancePath,
            schemaPath: "#/else/else/else/if",
            keyword: "if",
            params: { failingKeyword: ifClause3 },
            message: 'must match "' + ifClause3 + '" schema',
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
          validate17.errors = vErrors
          return false
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err13 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err13]
        } else {
          vErrors.push(err13)
        }
        errors++
        validate17.errors = vErrors
        return false
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err14 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err14]
      } else {
        vErrors.push(err14)
      }
      errors++
      validate17.errors = vErrors
      return false
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err15 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err15]
    } else {
      vErrors.push(err15)
    }
    errors++
    validate17.errors = vErrors
    return false
  }
  validate17.errors = vErrors
  return errors === 0
}
function validate16(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate16.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate16.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("doc" !== data.type) {
              validate16.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "doc" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              let data1 = data.content
              const _errs4 = errors
              if (errors === _errs4) {
                if (Array.isArray(data1)) {
                  if (data1.length < 1) {
                    validate16.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/minItems",
                        keyword: "minItems",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 items",
                      },
                    ]
                    return false
                  } else {
                    var valid1 = true
                    const len0 = data1.length
                    for (let i0 = 0; i0 < len0; i0++) {
                      const _errs6 = errors
                      if (
                        !validate17(data1[i0], {
                          instancePath: instancePath + "/content/" + i0,
                          parentData: data1,
                          parentDataProperty: i0,
                          rootData,
                        })
                      ) {
                        vErrors =
                          vErrors === null
                            ? validate17.errors
                            : vErrors.concat(validate17.errors)
                        errors = vErrors.length
                      }
                      var valid1 = _errs6 === errors
                      if (!valid1) {
                        break
                      }
                    }
                  }
                } else {
                  validate16.errors = [
                    {
                      instancePath: instancePath + "/content",
                      schemaPath: "#/properties/content/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate16.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate16.errors = vErrors
  return errors === 0
}
function validate15(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.doc === void 0 && (missing0 = "doc"))
      ) {
        validate15.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "id" || key0 === "type" || key0 === "doc")) {
            validate15.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs2 = errors
            const _errs3 = errors
            if (errors === _errs3) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate15.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate15.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs6 = errors
              if ("text" !== data.type) {
                validate15.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "text" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs6 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.doc !== void 0) {
                const _errs7 = errors
                if (
                  !validate16(data.doc, {
                    instancePath: instancePath + "/doc",
                    parentData: data,
                    parentDataProperty: "doc",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate16.errors
                      : vErrors.concat(validate16.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs7 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate15.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate15.errors = vErrors
  return errors === 0
}
var schema34 = {
  $comment:
    "mediaId null : image pas encore choisie. alt null : reprendre le texte alternatif de la m\xE9diath\xE8que. L\xE9gende : texte simple, 300 caract\xE8res au plus ([D34]), compt\xE9s en points de code.",
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "mediaId", "caption", "alt"],
  properties: {
    id: { $ref: "#/definitions/uuid" },
    type: { const: "image" },
    mediaId: { $ref: "#/definitions/nullableUuid" },
    caption: { type: ["string", "null"], maxLength: 300 },
    alt: { type: ["string", "null"], maxLength: 1e3 },
  },
}
var schema36 = {
  type: ["string", "null"],
  pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
}
function validate52(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.mediaId === void 0 && (missing0 = "mediaId")) ||
        (data.caption === void 0 && (missing0 = "caption")) ||
        (data.alt === void 0 && (missing0 = "alt"))
      ) {
        validate52.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "type" ||
            key0 === "mediaId" ||
            key0 === "caption" ||
            key0 === "alt"
          )) {
            validate52.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate52.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate52.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs7 = errors
              if ("image" !== data.type) {
                validate52.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "image" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.mediaId !== void 0) {
                let data2 = data.mediaId
                const _errs8 = errors
                const _errs9 = errors
                if (typeof data2 !== "string" && data2 !== null) {
                  validate52.errors = [
                    {
                      instancePath: instancePath + "/mediaId",
                      schemaPath: "#/definitions/nullableUuid/type",
                      keyword: "type",
                      params: { type: schema36.type },
                      message: "must be string,null",
                    },
                  ]
                  return false
                }
                if (errors === _errs9) {
                  if (typeof data2 === "string") {
                    if (!pattern0.test(data2)) {
                      validate52.errors = [
                        {
                          instancePath: instancePath + "/mediaId",
                          schemaPath: "#/definitions/nullableUuid/pattern",
                          keyword: "pattern",
                          params: {
                            pattern:
                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                          },
                          message:
                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                        },
                      ]
                      return false
                    }
                  }
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.caption !== void 0) {
                  let data3 = data.caption
                  const _errs11 = errors
                  if (typeof data3 !== "string" && data3 !== null) {
                    validate52.errors = [
                      {
                        instancePath: instancePath + "/caption",
                        schemaPath: "#/properties/caption/type",
                        keyword: "type",
                        params: { type: schema34.properties.caption.type },
                        message: "must be string,null",
                      },
                    ]
                    return false
                  }
                  if (errors === _errs11) {
                    if (typeof data3 === "string") {
                      if (func2(data3) > 300) {
                        validate52.errors = [
                          {
                            instancePath: instancePath + "/caption",
                            schemaPath: "#/properties/caption/maxLength",
                            keyword: "maxLength",
                            params: { limit: 300 },
                            message: "must NOT have more than 300 characters",
                          },
                        ]
                        return false
                      }
                    }
                  }
                  var valid0 = _errs11 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.alt !== void 0) {
                    let data4 = data.alt
                    const _errs13 = errors
                    if (typeof data4 !== "string" && data4 !== null) {
                      validate52.errors = [
                        {
                          instancePath: instancePath + "/alt",
                          schemaPath: "#/properties/alt/type",
                          keyword: "type",
                          params: { type: schema34.properties.alt.type },
                          message: "must be string,null",
                        },
                      ]
                      return false
                    }
                    if (errors === _errs13) {
                      if (typeof data4 === "string") {
                        if (func2(data4) > 1e3) {
                          validate52.errors = [
                            {
                              instancePath: instancePath + "/alt",
                              schemaPath: "#/properties/alt/maxLength",
                              keyword: "maxLength",
                              params: { limit: 1e3 },
                              message:
                                "must NOT have more than 1000 characters",
                            },
                          ]
                          return false
                        }
                      }
                    }
                    var valid0 = _errs13 === errors
                  } else {
                    var valid0 = true
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate52.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate52.errors = vErrors
  return errors === 0
}
var schema37 = {
  $comment:
    "Encadr\xE9 : un seul niveau, Texte et Image seulement (ni encadr\xE9, ni bloc li\xE9).",
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "look", "blocks"],
  properties: {
    id: { $ref: "#/definitions/uuid" },
    type: { const: "box" },
    look: { enum: ["fill", "border"] },
    blocks: { type: "array", items: { $ref: "#/definitions/boxChild" } },
  },
}
var schema39 = {
  tsType: "TextBlock | ImageBlock",
  if: {
    type: "object",
    required: ["type"],
    properties: { type: { const: "text" } },
  },
  then: { $ref: "#/definitions/textBlock" },
  else: {
    if: {
      type: "object",
      required: ["type"],
      properties: { type: { const: "image" } },
    },
    then: { $ref: "#/definitions/imageBlock" },
    else: {
      type: "object",
      required: ["type"],
      properties: { type: { enum: ["text", "image"] } },
    },
  },
}
function validate55(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate15(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate15.errors : vErrors.concat(validate15.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    let valid2 = true
    const _errs7 = errors
    if (errors === _errs7) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("image" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs7 === errors
    errors = _errs6
    if (vErrors !== null) {
      if (_errs6) {
        vErrors.length = _errs6
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs10 = errors
      if (
        !validate52(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs10 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs11 = errors
      if (errors === _errs11) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            validate55.errors = [
              {
                instancePath,
                schemaPath: "#/else/else/required",
                keyword: "required",
                params: { missingProperty: missing2 },
                message: "must have required property '" + missing2 + "'",
              },
            ]
            return false
          } else {
            if (data.type !== void 0) {
              let data2 = data.type
              if (!(data2 === "text" || data2 === "image")) {
                validate55.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/else/else/properties/type/enum",
                    keyword: "enum",
                    params: {
                      allowedValues: schema39.else.else.properties.type.enum,
                    },
                    message: "must be equal to one of the allowed values",
                  },
                ]
                return false
              }
            }
          }
        } else {
          validate55.errors = [
            {
              instancePath,
              schemaPath: "#/else/else/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            },
          ]
          return false
        }
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err6 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err6]
      } else {
        vErrors.push(err6)
      }
      errors++
      validate55.errors = vErrors
      return false
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err7 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err7]
    } else {
      vErrors.push(err7)
    }
    errors++
    validate55.errors = vErrors
    return false
  }
  validate55.errors = vErrors
  return errors === 0
}
function validate54(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.look === void 0 && (missing0 = "look")) ||
        (data.blocks === void 0 && (missing0 = "blocks"))
      ) {
        validate54.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "type" ||
            key0 === "look" ||
            key0 === "blocks"
          )) {
            validate54.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate54.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate54.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs7 = errors
              if ("box" !== data.type) {
                validate54.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "box" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.look !== void 0) {
                let data2 = data.look
                const _errs8 = errors
                if (!(data2 === "fill" || data2 === "border")) {
                  validate54.errors = [
                    {
                      instancePath: instancePath + "/look",
                      schemaPath: "#/properties/look/enum",
                      keyword: "enum",
                      params: { allowedValues: schema37.properties.look.enum },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.blocks !== void 0) {
                  let data3 = data.blocks
                  const _errs9 = errors
                  if (errors === _errs9) {
                    if (Array.isArray(data3)) {
                      var valid2 = true
                      const len0 = data3.length
                      for (let i0 = 0; i0 < len0; i0++) {
                        const _errs11 = errors
                        if (
                          !validate55(data3[i0], {
                            instancePath: instancePath + "/blocks/" + i0,
                            parentData: data3,
                            parentDataProperty: i0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validate55.errors
                              : vErrors.concat(validate55.errors)
                          errors = vErrors.length
                        }
                        var valid2 = _errs11 === errors
                        if (!valid2) {
                          break
                        }
                      }
                    } else {
                      validate54.errors = [
                        {
                          instancePath: instancePath + "/blocks",
                          schemaPath: "#/properties/blocks/type",
                          keyword: "type",
                          params: { type: "array" },
                          message: "must be array",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs9 === errors
                } else {
                  var valid0 = true
                }
              }
            }
          }
        }
      }
    } else {
      validate54.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate54.errors = vErrors
  return errors === 0
}
function validate60(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.templateId === void 0 && (missing0 = "templateId"))
      ) {
        validate60.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "id" || key0 === "type" || key0 === "templateId")) {
            validate60.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate60.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate60.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs7 = errors
              if ("linked" !== data.type) {
                validate60.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "linked" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.templateId !== void 0) {
                let data2 = data.templateId
                const _errs8 = errors
                const _errs9 = errors
                if (errors === _errs9) {
                  if (typeof data2 === "string") {
                    if (!pattern0.test(data2)) {
                      validate60.errors = [
                        {
                          instancePath: instancePath + "/templateId",
                          schemaPath: "#/definitions/uuid/pattern",
                          keyword: "pattern",
                          params: {
                            pattern:
                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                          },
                          message:
                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                        },
                      ]
                      return false
                    }
                  } else {
                    validate60.errors = [
                      {
                        instancePath: instancePath + "/templateId",
                        schemaPath: "#/definitions/uuid/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate60.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate60.errors = vErrors
  return errors === 0
}
function validate14(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs1 = errors
  let valid0 = true
  const _errs2 = errors
  if (errors === _errs2) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs2 === errors
  errors = _errs1
  if (vErrors !== null) {
    if (_errs1) {
      vErrors.length = _errs1
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs5 = errors
    if (
      !validate15(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate15.errors : vErrors.concat(validate15.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs6 = errors
    const _errs7 = errors
    let valid2 = true
    const _errs8 = errors
    if (errors === _errs8) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("image" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs8 === errors
    errors = _errs7
    if (vErrors !== null) {
      if (_errs7) {
        vErrors.length = _errs7
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs11 = errors
      if (
        !validate52(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs12 = errors
      const _errs13 = errors
      let valid4 = true
      const _errs14 = errors
      if (errors === _errs14) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("box" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs14 === errors
      errors = _errs13
      if (vErrors !== null) {
        if (_errs13) {
          vErrors.length = _errs13
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs17 = errors
        if (
          !validate54(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate54.errors
              : vErrors.concat(validate54.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs18 = errors
        const _errs19 = errors
        let valid6 = true
        const _errs20 = errors
        if (errors === _errs20) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              const err9 = {}
              if (vErrors === null) {
                vErrors = [err9]
              } else {
                vErrors.push(err9)
              }
              errors++
            } else {
              if (data.type !== void 0) {
                if ("linked" !== data.type) {
                  const err10 = {}
                  if (vErrors === null) {
                    vErrors = [err10]
                  } else {
                    vErrors.push(err10)
                  }
                  errors++
                }
              }
            }
          } else {
            const err11 = {}
            if (vErrors === null) {
              vErrors = [err11]
            } else {
              vErrors.push(err11)
            }
            errors++
          }
        }
        var _valid3 = _errs20 === errors
        errors = _errs19
        if (vErrors !== null) {
          if (_errs19) {
            vErrors.length = _errs19
          } else {
            vErrors = null
          }
        }
        let ifClause3
        if (_valid3) {
          const _errs23 = errors
          if (
            !validate60(data, {
              instancePath,
              parentData,
              parentDataProperty,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate60.errors
                : vErrors.concat(validate60.errors)
            errors = vErrors.length
          }
          var _valid3 = _errs23 === errors
          valid6 = _valid3
          ifClause3 = "then"
        } else {
          const _errs24 = errors
          if (errors === _errs24) {
            if (data && typeof data == "object" && !Array.isArray(data)) {
              let missing4
              if (data.type === void 0 && (missing4 = "type")) {
                validate14.errors = [
                  {
                    instancePath,
                    schemaPath: "#/else/else/else/else/required",
                    keyword: "required",
                    params: { missingProperty: missing4 },
                    message: "must have required property '" + missing4 + "'",
                  },
                ]
                return false
              } else {
                if (data.type !== void 0) {
                  let data4 = data.type
                  if (!(
                    data4 === "text" ||
                    data4 === "image" ||
                    data4 === "box" ||
                    data4 === "linked"
                  )) {
                    validate14.errors = [
                      {
                        instancePath: instancePath + "/type",
                        schemaPath:
                          "#/else/else/else/else/properties/type/enum",
                        keyword: "enum",
                        params: {
                          allowedValues:
                            schema14.else.else.else.else.properties.type.enum,
                        },
                        message: "must be equal to one of the allowed values",
                      },
                    ]
                    return false
                  }
                }
              }
            } else {
              validate14.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/else/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                },
              ]
              return false
            }
          }
          var _valid3 = _errs24 === errors
          valid6 = _valid3
          ifClause3 = "else"
        }
        if (!valid6) {
          const err12 = {
            instancePath,
            schemaPath: "#/else/else/else/if",
            keyword: "if",
            params: { failingKeyword: ifClause3 },
            message: 'must match "' + ifClause3 + '" schema',
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
          validate14.errors = vErrors
          return false
        }
        var _valid2 = _errs18 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err13 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err13]
        } else {
          vErrors.push(err13)
        }
        errors++
        validate14.errors = vErrors
        return false
      }
      var _valid1 = _errs12 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err14 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err14]
      } else {
        vErrors.push(err14)
      }
      errors++
      validate14.errors = vErrors
      return false
    }
    var _valid0 = _errs6 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err15 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err15]
    } else {
      vErrors.push(err15)
    }
    errors++
    validate14.errors = vErrors
    return false
  }
  validate14.errors = vErrors
  return errors === 0
}
function validate10(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.v === void 0 && (missing0 = "v")) ||
        (data.title === void 0 && (missing0 = "title")) ||
        (data.blocks === void 0 && (missing0 = "blocks"))
      ) {
        validate10.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "v" ||
            key0 === "title" ||
            key0 === "cover" ||
            key0 === "audio" ||
            key0 === "blocks"
          )) {
            validate10.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.v !== void 0) {
            const _errs3 = errors
            if (1 !== data.v) {
              validate10.errors = [
                {
                  instancePath: instancePath + "/v",
                  schemaPath: "#/properties/v/const",
                  keyword: "const",
                  params: { allowedValue: 1 },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.title !== void 0) {
              let data1 = data.title
              const _errs4 = errors
              if (errors === _errs4) {
                if (typeof data1 === "string") {
                  if (func2(data1) > 200) {
                    validate10.errors = [
                      {
                        instancePath: instancePath + "/title",
                        schemaPath: "#/properties/title/maxLength",
                        keyword: "maxLength",
                        params: { limit: 200 },
                        message: "must NOT have more than 200 characters",
                      },
                    ]
                    return false
                  }
                } else {
                  validate10.errors = [
                    {
                      instancePath: instancePath + "/title",
                      schemaPath: "#/properties/title/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.cover !== void 0) {
                const _errs6 = errors
                if (
                  !validate11(data.cover, {
                    instancePath: instancePath + "/cover",
                    parentData: data,
                    parentDataProperty: "cover",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate11.errors
                      : vErrors.concat(validate11.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs6 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.audio !== void 0) {
                  const _errs7 = errors
                  if (
                    !validate11(data.audio, {
                      instancePath: instancePath + "/audio",
                      parentData: data,
                      parentDataProperty: "audio",
                      rootData,
                    })
                  ) {
                    vErrors =
                      vErrors === null
                        ? validate11.errors
                        : vErrors.concat(validate11.errors)
                    errors = vErrors.length
                  }
                  var valid0 = _errs7 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.blocks !== void 0) {
                    let data4 = data.blocks
                    const _errs8 = errors
                    if (errors === _errs8) {
                      if (Array.isArray(data4)) {
                        var valid1 = true
                        const len0 = data4.length
                        for (let i0 = 0; i0 < len0; i0++) {
                          const _errs10 = errors
                          if (
                            !validate14(data4[i0], {
                              instancePath: instancePath + "/blocks/" + i0,
                              parentData: data4,
                              parentDataProperty: i0,
                              rootData,
                            })
                          ) {
                            vErrors =
                              vErrors === null
                                ? validate14.errors
                                : vErrors.concat(validate14.errors)
                            errors = vErrors.length
                          }
                          var valid1 = _errs10 === errors
                          if (!valid1) {
                            break
                          }
                        }
                      } else {
                        validate10.errors = [
                          {
                            instancePath: instancePath + "/blocks",
                            schemaPath: "#/properties/blocks/type",
                            keyword: "type",
                            params: { type: "array" },
                            message: "must be array",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs8 === errors
                  } else {
                    var valid0 = true
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate10.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate10.errors = vErrors
  return errors === 0
}
var validateTemplate = validate63
function validate64(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (
    !(data && typeof data == "object" && !Array.isArray(data)) &&
    data !== null
  ) {
    validate64.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: { type: schema12.type },
        message: "must be object,null",
      },
    ]
    return false
  }
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.mediaId === void 0 && (missing0 = "mediaId")) {
        validate64.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "mediaId")) {
            validate64.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.mediaId !== void 0) {
            let data0 = data.mediaId
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate64.errors = [
                    {
                      instancePath: instancePath + "/mediaId",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate64.errors = [
                  {
                    instancePath: instancePath + "/mediaId",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
          }
        }
      }
    }
  }
  validate64.errors = vErrors
  return errors === 0
}
var schema46 = {
  $comment:
    "Un bloc au premier niveau d'un mod\xE8le : pas de bloc li\xE9 (ni cha\xEEne ni boucle).",
  tsType: "TextBlock | ImageBlock | BoxBlock",
  if: {
    type: "object",
    required: ["type"],
    properties: { type: { const: "text" } },
  },
  then: { $ref: "#/definitions/textBlock" },
  else: {
    if: {
      type: "object",
      required: ["type"],
      properties: { type: { const: "image" } },
    },
    then: { $ref: "#/definitions/imageBlock" },
    else: {
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "box" } },
      },
      then: { $ref: "#/definitions/boxBlock" },
      else: {
        type: "object",
        required: ["type"],
        properties: { type: { enum: ["text", "image", "box"] } },
      },
    },
  },
}
function validate77(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.attrs === void 0 && (missing0 = "attrs"))
      ) {
        validate77.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "attrs")) {
            validate77.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("link" !== data.type) {
              validate77.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "link" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.attrs !== void 0) {
              let data1 = data.attrs
              const _errs3 = errors
              if (errors === _errs3) {
                if (
                  data1 &&
                  typeof data1 == "object" &&
                  !Array.isArray(data1)
                ) {
                  let missing1
                  if (data1.href === void 0 && (missing1 = "href")) {
                    validate77.errors = [
                      {
                        instancePath: instancePath + "/attrs",
                        schemaPath: "#/properties/attrs/required",
                        keyword: "required",
                        params: { missingProperty: missing1 },
                        message:
                          "must have required property '" + missing1 + "'",
                      },
                    ]
                    return false
                  } else {
                    const _errs5 = errors
                    for (const key1 in data1) {
                      if (!(key1 === "href")) {
                        validate77.errors = [
                          {
                            instancePath: instancePath + "/attrs",
                            schemaPath:
                              "#/properties/attrs/additionalProperties",
                            keyword: "additionalProperties",
                            params: { additionalProperty: key1 },
                            message: "must NOT have additional properties",
                          },
                        ]
                        return false
                        break
                      }
                    }
                    if (_errs5 === errors) {
                      if (data1.href !== void 0) {
                        let data2 = data1.href
                        const _errs7 = errors
                        if (errors === _errs7) {
                          if (typeof data2 === "string") {
                            if (func2(data2) > 2048) {
                              validate77.errors = [
                                {
                                  instancePath: instancePath + "/attrs/href",
                                  schemaPath: "#/definitions/href/maxLength",
                                  keyword: "maxLength",
                                  params: { limit: 2048 },
                                  message:
                                    "must NOT have more than 2048 characters",
                                },
                              ]
                              return false
                            } else {
                              if (!pattern2.test(data2)) {
                                validate77.errors = [
                                  {
                                    instancePath: instancePath + "/attrs/href",
                                    schemaPath: "#/definitions/href/pattern",
                                    keyword: "pattern",
                                    params: {
                                      pattern: "^(https://|mailto:)[^\\s]+$",
                                    },
                                    message:
                                      'must match pattern "^(https://|mailto:)[^\\s]+$"',
                                  },
                                ]
                                return false
                              }
                            }
                          } else {
                            validate77.errors = [
                              {
                                instancePath: instancePath + "/attrs/href",
                                schemaPath: "#/definitions/href/type",
                                keyword: "type",
                                params: { type: "string" },
                                message: "must be string",
                              },
                            ]
                            return false
                          }
                        }
                      }
                    }
                  }
                } else {
                  validate77.errors = [
                    {
                      instancePath: instancePath + "/attrs",
                      schemaPath: "#/properties/attrs/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate77.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate77.errors = vErrors
  return errors === 0
}
function validate76(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("link" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate77(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate77.errors : vErrors.concat(validate77.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    if (errors === _errs6) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          validate76.errors = [
            {
              instancePath,
              schemaPath: "#/definitions/basicMark/required",
              keyword: "required",
              params: { missingProperty: missing1 },
              message: "must have required property '" + missing1 + "'",
            },
          ]
          return false
        } else {
          const _errs8 = errors
          for (const key0 in data) {
            if (!(key0 === "type")) {
              validate76.errors = [
                {
                  instancePath,
                  schemaPath: "#/definitions/basicMark/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key0 },
                  message: "must NOT have additional properties",
                },
              ]
              return false
              break
            }
          }
          if (_errs8 === errors) {
            if (data.type !== void 0) {
              let data1 = data.type
              if (!(data1 === "bold" || data1 === "italic")) {
                validate76.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/definitions/basicMark/properties/type/enum",
                    keyword: "enum",
                    params: { allowedValues: schema27.properties.type.enum },
                    message: "must be equal to one of the allowed values",
                  },
                ]
                return false
              }
            }
          }
        }
      } else {
        validate76.errors = [
          {
            instancePath,
            schemaPath: "#/definitions/basicMark/type",
            keyword: "type",
            params: { type: "object" },
            message: "must be object",
          },
        ]
        return false
      }
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err3 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
    }
    errors++
    validate76.errors = vErrors
    return false
  }
  validate76.errors = vErrors
  return errors === 0
}
function validate75(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (Array.isArray(data)) {
      var valid0 = true
      const len0 = data.length
      for (let i0 = 0; i0 < len0; i0++) {
        const _errs1 = errors
        if (
          !validate76(data[i0], {
            instancePath: instancePath + "/" + i0,
            parentData: data,
            parentDataProperty: i0,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate76.errors
              : vErrors.concat(validate76.errors)
          errors = vErrors.length
        }
        var valid0 = _errs1 === errors
        if (!valid0) {
          break
        }
      }
    } else {
      validate75.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        },
      ]
      return false
    }
  }
  validate75.errors = vErrors
  return errors === 0
}
function validate74(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.text === void 0 && (missing0 = "text"))
      ) {
        validate74.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "text" || key0 === "marks")) {
            validate74.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("text" !== data.type) {
              validate74.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "text" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.text !== void 0) {
              let data1 = data.text
              const _errs3 = errors
              if (errors === _errs3) {
                if (typeof data1 === "string") {
                  if (func2(data1) < 1) {
                    validate74.errors = [
                      {
                        instancePath: instancePath + "/text",
                        schemaPath: "#/properties/text/minLength",
                        keyword: "minLength",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 characters",
                      },
                    ]
                    return false
                  }
                } else {
                  validate74.errors = [
                    {
                      instancePath: instancePath + "/text",
                      schemaPath: "#/properties/text/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.marks !== void 0) {
                const _errs5 = errors
                if (
                  !validate75(data.marks, {
                    instancePath: instancePath + "/marks",
                    parentData: data,
                    parentDataProperty: "marks",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate75.errors
                      : vErrors.concat(validate75.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs5 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate74.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate74.errors = vErrors
  return errors === 0
}
function validate82(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        validate82.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "marks")) {
            validate82.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("hardBreak" !== data.type) {
              validate82.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "hardBreak" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.marks !== void 0) {
              const _errs3 = errors
              if (
                !validate75(data.marks, {
                  instancePath: instancePath + "/marks",
                  parentData: data,
                  parentDataProperty: "marks",
                  rootData,
                })
              ) {
                vErrors =
                  vErrors === null
                    ? validate75.errors
                    : vErrors.concat(validate75.errors)
                errors = vErrors.length
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate82.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate82.errors = vErrors
  return errors === 0
}
function validate73(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate74(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate74.errors : vErrors.concat(validate74.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    if (
      !validate82(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate82.errors : vErrors.concat(validate82.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err3 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
    }
    errors++
    validate73.errors = vErrors
    return false
  }
  validate73.errors = vErrors
  return errors === 0
}
function validate72(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (Array.isArray(data)) {
      var valid0 = true
      const len0 = data.length
      for (let i0 = 0; i0 < len0; i0++) {
        const _errs1 = errors
        if (
          !validate73(data[i0], {
            instancePath: instancePath + "/" + i0,
            parentData: data,
            parentDataProperty: i0,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate73.errors
              : vErrors.concat(validate73.errors)
          errors = vErrors.length
        }
        var valid0 = _errs1 === errors
        if (!valid0) {
          break
        }
      }
    } else {
      validate72.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        },
      ]
      return false
    }
  }
  validate72.errors = vErrors
  return errors === 0
}
function validate71(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        validate71.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate71.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("paragraph" !== data.type) {
              validate71.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "paragraph" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              const _errs3 = errors
              if (
                !validate72(data.content, {
                  instancePath: instancePath + "/content",
                  parentData: data,
                  parentDataProperty: "content",
                  rootData,
                })
              ) {
                vErrors =
                  vErrors === null
                    ? validate72.errors
                    : vErrors.concat(validate72.errors)
                errors = vErrors.length
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate71.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate71.errors = vErrors
  return errors === 0
}
function validate88(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.attrs === void 0 && (missing0 = "attrs"))
      ) {
        validate88.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "attrs" || key0 === "content")) {
            validate88.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("heading" !== data.type) {
              validate88.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "heading" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.attrs !== void 0) {
              let data1 = data.attrs
              const _errs4 = errors
              if (errors === _errs4) {
                if (
                  data1 &&
                  typeof data1 == "object" &&
                  !Array.isArray(data1)
                ) {
                  let missing1
                  if (data1.level === void 0 && (missing1 = "level")) {
                    validate88.errors = [
                      {
                        instancePath: instancePath + "/attrs",
                        schemaPath: "#/properties/attrs/required",
                        keyword: "required",
                        params: { missingProperty: missing1 },
                        message:
                          "must have required property '" + missing1 + "'",
                      },
                    ]
                    return false
                  } else {
                    const _errs6 = errors
                    for (const key1 in data1) {
                      if (!(key1 === "level")) {
                        validate88.errors = [
                          {
                            instancePath: instancePath + "/attrs",
                            schemaPath:
                              "#/properties/attrs/additionalProperties",
                            keyword: "additionalProperties",
                            params: { additionalProperty: key1 },
                            message: "must NOT have additional properties",
                          },
                        ]
                        return false
                        break
                      }
                    }
                    if (_errs6 === errors) {
                      if (data1.level !== void 0) {
                        let data2 = data1.level
                        if (!(data2 === 2 || data2 === 3)) {
                          validate88.errors = [
                            {
                              instancePath: instancePath + "/attrs/level",
                              schemaPath:
                                "#/properties/attrs/properties/level/enum",
                              keyword: "enum",
                              params: {
                                allowedValues:
                                  schema29.properties.attrs.properties.level
                                    .enum,
                              },
                              message:
                                "must be equal to one of the allowed values",
                            },
                          ]
                          return false
                        }
                      }
                    }
                  }
                } else {
                  validate88.errors = [
                    {
                      instancePath: instancePath + "/attrs",
                      schemaPath: "#/properties/attrs/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.content !== void 0) {
                const _errs8 = errors
                if (
                  !validate72(data.content, {
                    instancePath: instancePath + "/content",
                    parentData: data,
                    parentDataProperty: "content",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate72.errors
                      : vErrors.concat(validate72.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate88.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate88.errors = vErrors
  return errors === 0
}
var wrapper3 = { validate: validate92 }
function validate95(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate95.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "attrs" || key0 === "content")) {
            validate95.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("orderedList" !== data.type) {
              validate95.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "orderedList" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.attrs !== void 0) {
              let data1 = data.attrs
              const _errs4 = errors
              if (errors === _errs4) {
                if (
                  data1 &&
                  typeof data1 == "object" &&
                  !Array.isArray(data1)
                ) {
                  const _errs6 = errors
                  for (const key1 in data1) {
                    if (!(key1 === "start")) {
                      validate95.errors = [
                        {
                          instancePath: instancePath + "/attrs",
                          schemaPath: "#/properties/attrs/additionalProperties",
                          keyword: "additionalProperties",
                          params: { additionalProperty: key1 },
                          message: "must NOT have additional properties",
                        },
                      ]
                      return false
                      break
                    }
                  }
                  if (_errs6 === errors) {
                    if (data1.start !== void 0) {
                      let data2 = data1.start
                      const _errs7 = errors
                      if (!(
                        typeof data2 == "number" &&
                        !(data2 % 1) &&
                        !isNaN(data2) &&
                        isFinite(data2)
                      )) {
                        validate95.errors = [
                          {
                            instancePath: instancePath + "/attrs/start",
                            schemaPath:
                              "#/properties/attrs/properties/start/type",
                            keyword: "type",
                            params: { type: "integer" },
                            message: "must be integer",
                          },
                        ]
                        return false
                      }
                      if (errors === _errs7) {
                        if (typeof data2 == "number" && isFinite(data2)) {
                          if (data2 > 99999 || isNaN(data2)) {
                            validate95.errors = [
                              {
                                instancePath: instancePath + "/attrs/start",
                                schemaPath:
                                  "#/properties/attrs/properties/start/maximum",
                                keyword: "maximum",
                                params: { comparison: "<=", limit: 99999 },
                                message: "must be <= 99999",
                              },
                            ]
                            return false
                          } else {
                            if (data2 < 1 || isNaN(data2)) {
                              validate95.errors = [
                                {
                                  instancePath: instancePath + "/attrs/start",
                                  schemaPath:
                                    "#/properties/attrs/properties/start/minimum",
                                  keyword: "minimum",
                                  params: { comparison: ">=", limit: 1 },
                                  message: "must be >= 1",
                                },
                              ]
                              return false
                            }
                          }
                        }
                      }
                    }
                  }
                } else {
                  validate95.errors = [
                    {
                      instancePath: instancePath + "/attrs",
                      schemaPath: "#/properties/attrs/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.content !== void 0) {
                let data3 = data.content
                const _errs9 = errors
                if (errors === _errs9) {
                  if (Array.isArray(data3)) {
                    if (data3.length < 1) {
                      validate95.errors = [
                        {
                          instancePath: instancePath + "/content",
                          schemaPath: "#/properties/content/minItems",
                          keyword: "minItems",
                          params: { limit: 1 },
                          message: "must NOT have fewer than 1 items",
                        },
                      ]
                      return false
                    } else {
                      var valid2 = true
                      const len0 = data3.length
                      for (let i0 = 0; i0 < len0; i0++) {
                        const _errs11 = errors
                        if (
                          !wrapper3.validate(data3[i0], {
                            instancePath: instancePath + "/content/" + i0,
                            parentData: data3,
                            parentDataProperty: i0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? wrapper3.validate.errors
                              : vErrors.concat(wrapper3.validate.errors)
                          errors = vErrors.length
                        }
                        var valid2 = _errs11 === errors
                        if (!valid2) {
                          break
                        }
                      }
                    }
                  } else {
                    validate95.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/type",
                        keyword: "type",
                        params: { type: "array" },
                        message: "must be array",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs9 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate95.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate95.errors = vErrors
  return errors === 0
}
var wrapper2 = { validate: validate91 }
function validate93(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("paragraph" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate71(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate71.errors : vErrors.concat(validate71.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    let valid2 = true
    const _errs7 = errors
    if (errors === _errs7) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("bulletList" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs7 === errors
    errors = _errs6
    if (vErrors !== null) {
      if (_errs6) {
        vErrors.length = _errs6
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs10 = errors
      if (
        !wrapper2.validate(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? wrapper2.validate.errors
            : vErrors.concat(wrapper2.validate.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs10 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs11 = errors
      const _errs12 = errors
      let valid4 = true
      const _errs13 = errors
      if (errors === _errs13) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("orderedList" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs13 === errors
      errors = _errs12
      if (vErrors !== null) {
        if (_errs12) {
          vErrors.length = _errs12
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs16 = errors
        if (
          !validate95(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate95.errors
              : vErrors.concat(validate95.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs16 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs17 = errors
        if (errors === _errs17) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              validate93.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/required",
                  keyword: "required",
                  params: { missingProperty: missing3 },
                  message: "must have required property '" + missing3 + "'",
                },
              ]
              return false
            } else {
              if (data.type !== void 0) {
                let data3 = data.type
                if (!(
                  data3 === "paragraph" ||
                  data3 === "bulletList" ||
                  data3 === "orderedList"
                )) {
                  validate93.errors = [
                    {
                      instancePath: instancePath + "/type",
                      schemaPath: "#/else/else/else/properties/type/enum",
                      keyword: "enum",
                      params: {
                        allowedValues:
                          schema32.else.else.else.properties.type.enum,
                      },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
              }
            }
          } else {
            validate93.errors = [
              {
                instancePath,
                schemaPath: "#/else/else/else/type",
                keyword: "type",
                params: { type: "object" },
                message: "must be object",
              },
            ]
            return false
          }
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err9 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
        validate93.errors = vErrors
        return false
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err10 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
      validate93.errors = vErrors
      return false
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err11 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err11]
    } else {
      vErrors.push(err11)
    }
    errors++
    validate93.errors = vErrors
    return false
  }
  validate93.errors = vErrors
  return errors === 0
}
function validate92(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate92.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate92.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("listItem" !== data.type) {
              validate92.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "listItem" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              let data1 = data.content
              const _errs4 = errors
              if (errors === _errs4) {
                if (Array.isArray(data1)) {
                  if (data1.length < 1) {
                    validate92.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/minItems",
                        keyword: "minItems",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 items",
                      },
                    ]
                    return false
                  } else {
                    const len0 = data1.length
                    var valid1 = len0 <= 1
                    if (!valid1) {
                      for (let i0 = 1; i0 < len0; i0++) {
                        const _errs6 = errors
                        if (
                          !validate93(data1[i0], {
                            instancePath: instancePath + "/content/" + i0,
                            parentData: data1,
                            parentDataProperty: i0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validate93.errors
                              : vErrors.concat(validate93.errors)
                          errors = vErrors.length
                        }
                        var valid1 = _errs6 === errors
                        if (!valid1) {
                          break
                        }
                      }
                    }
                    if (valid1) {
                      const len1 = data1.length
                      if (len1 > 0) {
                        if (
                          !validate71(data1[0], {
                            instancePath: instancePath + "/content/0",
                            parentData: data1,
                            parentDataProperty: 0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validate71.errors
                              : vErrors.concat(validate71.errors)
                          errors = vErrors.length
                        }
                      }
                    }
                  }
                } else {
                  validate92.errors = [
                    {
                      instancePath: instancePath + "/content",
                      schemaPath: "#/properties/content/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate92.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate92.errors = vErrors
  return errors === 0
}
function validate91(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate91.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate91.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("bulletList" !== data.type) {
              validate91.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "bulletList" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              let data1 = data.content
              const _errs3 = errors
              if (errors === _errs3) {
                if (Array.isArray(data1)) {
                  if (data1.length < 1) {
                    validate91.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/minItems",
                        keyword: "minItems",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 items",
                      },
                    ]
                    return false
                  } else {
                    var valid1 = true
                    const len0 = data1.length
                    for (let i0 = 0; i0 < len0; i0++) {
                      const _errs5 = errors
                      if (
                        !validate92(data1[i0], {
                          instancePath: instancePath + "/content/" + i0,
                          parentData: data1,
                          parentDataProperty: i0,
                          rootData,
                        })
                      ) {
                        vErrors =
                          vErrors === null
                            ? validate92.errors
                            : vErrors.concat(validate92.errors)
                        errors = vErrors.length
                      }
                      var valid1 = _errs5 === errors
                      if (!valid1) {
                        break
                      }
                    }
                  }
                } else {
                  validate91.errors = [
                    {
                      instancePath: instancePath + "/content",
                      schemaPath: "#/properties/content/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate91.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate91.errors = vErrors
  return errors === 0
}
function validate70(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("paragraph" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate71(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate71.errors : vErrors.concat(validate71.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    let valid2 = true
    const _errs7 = errors
    if (errors === _errs7) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("heading" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs7 === errors
    errors = _errs6
    if (vErrors !== null) {
      if (_errs6) {
        vErrors.length = _errs6
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs10 = errors
      if (
        !validate88(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate88.errors
            : vErrors.concat(validate88.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs10 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs11 = errors
      const _errs12 = errors
      let valid4 = true
      const _errs13 = errors
      if (errors === _errs13) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("bulletList" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs13 === errors
      errors = _errs12
      if (vErrors !== null) {
        if (_errs12) {
          vErrors.length = _errs12
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs16 = errors
        if (
          !validate91(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate91.errors
              : vErrors.concat(validate91.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs16 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs17 = errors
        const _errs18 = errors
        let valid6 = true
        const _errs19 = errors
        if (errors === _errs19) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              const err9 = {}
              if (vErrors === null) {
                vErrors = [err9]
              } else {
                vErrors.push(err9)
              }
              errors++
            } else {
              if (data.type !== void 0) {
                if ("orderedList" !== data.type) {
                  const err10 = {}
                  if (vErrors === null) {
                    vErrors = [err10]
                  } else {
                    vErrors.push(err10)
                  }
                  errors++
                }
              }
            }
          } else {
            const err11 = {}
            if (vErrors === null) {
              vErrors = [err11]
            } else {
              vErrors.push(err11)
            }
            errors++
          }
        }
        var _valid3 = _errs19 === errors
        errors = _errs18
        if (vErrors !== null) {
          if (_errs18) {
            vErrors.length = _errs18
          } else {
            vErrors = null
          }
        }
        let ifClause3
        if (_valid3) {
          const _errs22 = errors
          if (
            !validate95(data, {
              instancePath,
              parentData,
              parentDataProperty,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate95.errors
                : vErrors.concat(validate95.errors)
            errors = vErrors.length
          }
          var _valid3 = _errs22 === errors
          valid6 = _valid3
          ifClause3 = "then"
        } else {
          const _errs23 = errors
          if (errors === _errs23) {
            if (data && typeof data == "object" && !Array.isArray(data)) {
              let missing4
              if (data.type === void 0 && (missing4 = "type")) {
                validate70.errors = [
                  {
                    instancePath,
                    schemaPath: "#/else/else/else/else/required",
                    keyword: "required",
                    params: { missingProperty: missing4 },
                    message: "must have required property '" + missing4 + "'",
                  },
                ]
                return false
              } else {
                if (data.type !== void 0) {
                  let data4 = data.type
                  if (!(
                    data4 === "paragraph" ||
                    data4 === "heading" ||
                    data4 === "bulletList" ||
                    data4 === "orderedList"
                  )) {
                    validate70.errors = [
                      {
                        instancePath: instancePath + "/type",
                        schemaPath:
                          "#/else/else/else/else/properties/type/enum",
                        keyword: "enum",
                        params: {
                          allowedValues:
                            schema18.else.else.else.else.properties.type.enum,
                        },
                        message: "must be equal to one of the allowed values",
                      },
                    ]
                    return false
                  }
                }
              }
            } else {
              validate70.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/else/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                },
              ]
              return false
            }
          }
          var _valid3 = _errs23 === errors
          valid6 = _valid3
          ifClause3 = "else"
        }
        if (!valid6) {
          const err12 = {
            instancePath,
            schemaPath: "#/else/else/else/if",
            keyword: "if",
            params: { failingKeyword: ifClause3 },
            message: 'must match "' + ifClause3 + '" schema',
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
          validate70.errors = vErrors
          return false
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err13 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err13]
        } else {
          vErrors.push(err13)
        }
        errors++
        validate70.errors = vErrors
        return false
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err14 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err14]
      } else {
        vErrors.push(err14)
      }
      errors++
      validate70.errors = vErrors
      return false
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err15 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err15]
    } else {
      vErrors.push(err15)
    }
    errors++
    validate70.errors = vErrors
    return false
  }
  validate70.errors = vErrors
  return errors === 0
}
function validate69(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate69.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate69.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("doc" !== data.type) {
              validate69.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "doc" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              let data1 = data.content
              const _errs4 = errors
              if (errors === _errs4) {
                if (Array.isArray(data1)) {
                  if (data1.length < 1) {
                    validate69.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/minItems",
                        keyword: "minItems",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 items",
                      },
                    ]
                    return false
                  } else {
                    var valid1 = true
                    const len0 = data1.length
                    for (let i0 = 0; i0 < len0; i0++) {
                      const _errs6 = errors
                      if (
                        !validate70(data1[i0], {
                          instancePath: instancePath + "/content/" + i0,
                          parentData: data1,
                          parentDataProperty: i0,
                          rootData,
                        })
                      ) {
                        vErrors =
                          vErrors === null
                            ? validate70.errors
                            : vErrors.concat(validate70.errors)
                        errors = vErrors.length
                      }
                      var valid1 = _errs6 === errors
                      if (!valid1) {
                        break
                      }
                    }
                  }
                } else {
                  validate69.errors = [
                    {
                      instancePath: instancePath + "/content",
                      schemaPath: "#/properties/content/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate69.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate69.errors = vErrors
  return errors === 0
}
function validate68(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.doc === void 0 && (missing0 = "doc"))
      ) {
        validate68.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "id" || key0 === "type" || key0 === "doc")) {
            validate68.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs2 = errors
            const _errs3 = errors
            if (errors === _errs3) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate68.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate68.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs6 = errors
              if ("text" !== data.type) {
                validate68.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "text" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs6 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.doc !== void 0) {
                const _errs7 = errors
                if (
                  !validate69(data.doc, {
                    instancePath: instancePath + "/doc",
                    parentData: data,
                    parentDataProperty: "doc",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate69.errors
                      : vErrors.concat(validate69.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs7 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate68.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate68.errors = vErrors
  return errors === 0
}
function validate105(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.mediaId === void 0 && (missing0 = "mediaId")) ||
        (data.caption === void 0 && (missing0 = "caption")) ||
        (data.alt === void 0 && (missing0 = "alt"))
      ) {
        validate105.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "type" ||
            key0 === "mediaId" ||
            key0 === "caption" ||
            key0 === "alt"
          )) {
            validate105.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate105.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate105.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs7 = errors
              if ("image" !== data.type) {
                validate105.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "image" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.mediaId !== void 0) {
                let data2 = data.mediaId
                const _errs8 = errors
                const _errs9 = errors
                if (typeof data2 !== "string" && data2 !== null) {
                  validate105.errors = [
                    {
                      instancePath: instancePath + "/mediaId",
                      schemaPath: "#/definitions/nullableUuid/type",
                      keyword: "type",
                      params: { type: schema36.type },
                      message: "must be string,null",
                    },
                  ]
                  return false
                }
                if (errors === _errs9) {
                  if (typeof data2 === "string") {
                    if (!pattern0.test(data2)) {
                      validate105.errors = [
                        {
                          instancePath: instancePath + "/mediaId",
                          schemaPath: "#/definitions/nullableUuid/pattern",
                          keyword: "pattern",
                          params: {
                            pattern:
                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                          },
                          message:
                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                        },
                      ]
                      return false
                    }
                  }
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.caption !== void 0) {
                  let data3 = data.caption
                  const _errs11 = errors
                  if (typeof data3 !== "string" && data3 !== null) {
                    validate105.errors = [
                      {
                        instancePath: instancePath + "/caption",
                        schemaPath: "#/properties/caption/type",
                        keyword: "type",
                        params: { type: schema34.properties.caption.type },
                        message: "must be string,null",
                      },
                    ]
                    return false
                  }
                  if (errors === _errs11) {
                    if (typeof data3 === "string") {
                      if (func2(data3) > 300) {
                        validate105.errors = [
                          {
                            instancePath: instancePath + "/caption",
                            schemaPath: "#/properties/caption/maxLength",
                            keyword: "maxLength",
                            params: { limit: 300 },
                            message: "must NOT have more than 300 characters",
                          },
                        ]
                        return false
                      }
                    }
                  }
                  var valid0 = _errs11 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.alt !== void 0) {
                    let data4 = data.alt
                    const _errs13 = errors
                    if (typeof data4 !== "string" && data4 !== null) {
                      validate105.errors = [
                        {
                          instancePath: instancePath + "/alt",
                          schemaPath: "#/properties/alt/type",
                          keyword: "type",
                          params: { type: schema34.properties.alt.type },
                          message: "must be string,null",
                        },
                      ]
                      return false
                    }
                    if (errors === _errs13) {
                      if (typeof data4 === "string") {
                        if (func2(data4) > 1e3) {
                          validate105.errors = [
                            {
                              instancePath: instancePath + "/alt",
                              schemaPath: "#/properties/alt/maxLength",
                              keyword: "maxLength",
                              params: { limit: 1e3 },
                              message:
                                "must NOT have more than 1000 characters",
                            },
                          ]
                          return false
                        }
                      }
                    }
                    var valid0 = _errs13 === errors
                  } else {
                    var valid0 = true
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate105.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate105.errors = vErrors
  return errors === 0
}
function validate108(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate68(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate68.errors : vErrors.concat(validate68.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    let valid2 = true
    const _errs7 = errors
    if (errors === _errs7) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("image" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs7 === errors
    errors = _errs6
    if (vErrors !== null) {
      if (_errs6) {
        vErrors.length = _errs6
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs10 = errors
      if (
        !validate105(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate105.errors
            : vErrors.concat(validate105.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs10 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs11 = errors
      if (errors === _errs11) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            validate108.errors = [
              {
                instancePath,
                schemaPath: "#/else/else/required",
                keyword: "required",
                params: { missingProperty: missing2 },
                message: "must have required property '" + missing2 + "'",
              },
            ]
            return false
          } else {
            if (data.type !== void 0) {
              let data2 = data.type
              if (!(data2 === "text" || data2 === "image")) {
                validate108.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/else/else/properties/type/enum",
                    keyword: "enum",
                    params: {
                      allowedValues: schema39.else.else.properties.type.enum,
                    },
                    message: "must be equal to one of the allowed values",
                  },
                ]
                return false
              }
            }
          }
        } else {
          validate108.errors = [
            {
              instancePath,
              schemaPath: "#/else/else/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            },
          ]
          return false
        }
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err6 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err6]
      } else {
        vErrors.push(err6)
      }
      errors++
      validate108.errors = vErrors
      return false
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err7 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err7]
    } else {
      vErrors.push(err7)
    }
    errors++
    validate108.errors = vErrors
    return false
  }
  validate108.errors = vErrors
  return errors === 0
}
function validate107(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.look === void 0 && (missing0 = "look")) ||
        (data.blocks === void 0 && (missing0 = "blocks"))
      ) {
        validate107.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "type" ||
            key0 === "look" ||
            key0 === "blocks"
          )) {
            validate107.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate107.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate107.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs7 = errors
              if ("box" !== data.type) {
                validate107.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "box" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.look !== void 0) {
                let data2 = data.look
                const _errs8 = errors
                if (!(data2 === "fill" || data2 === "border")) {
                  validate107.errors = [
                    {
                      instancePath: instancePath + "/look",
                      schemaPath: "#/properties/look/enum",
                      keyword: "enum",
                      params: { allowedValues: schema37.properties.look.enum },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.blocks !== void 0) {
                  let data3 = data.blocks
                  const _errs9 = errors
                  if (errors === _errs9) {
                    if (Array.isArray(data3)) {
                      var valid2 = true
                      const len0 = data3.length
                      for (let i0 = 0; i0 < len0; i0++) {
                        const _errs11 = errors
                        if (
                          !validate108(data3[i0], {
                            instancePath: instancePath + "/blocks/" + i0,
                            parentData: data3,
                            parentDataProperty: i0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validate108.errors
                              : vErrors.concat(validate108.errors)
                          errors = vErrors.length
                        }
                        var valid2 = _errs11 === errors
                        if (!valid2) {
                          break
                        }
                      }
                    } else {
                      validate107.errors = [
                        {
                          instancePath: instancePath + "/blocks",
                          schemaPath: "#/properties/blocks/type",
                          keyword: "type",
                          params: { type: "array" },
                          message: "must be array",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs9 === errors
                } else {
                  var valid0 = true
                }
              }
            }
          }
        }
      }
    } else {
      validate107.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate107.errors = vErrors
  return errors === 0
}
function validate67(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs1 = errors
  let valid0 = true
  const _errs2 = errors
  if (errors === _errs2) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs2 === errors
  errors = _errs1
  if (vErrors !== null) {
    if (_errs1) {
      vErrors.length = _errs1
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs5 = errors
    if (
      !validate68(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate68.errors : vErrors.concat(validate68.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs6 = errors
    const _errs7 = errors
    let valid2 = true
    const _errs8 = errors
    if (errors === _errs8) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("image" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs8 === errors
    errors = _errs7
    if (vErrors !== null) {
      if (_errs7) {
        vErrors.length = _errs7
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs11 = errors
      if (
        !validate105(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate105.errors
            : vErrors.concat(validate105.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs12 = errors
      const _errs13 = errors
      let valid4 = true
      const _errs14 = errors
      if (errors === _errs14) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("box" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs14 === errors
      errors = _errs13
      if (vErrors !== null) {
        if (_errs13) {
          vErrors.length = _errs13
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs17 = errors
        if (
          !validate107(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate107.errors
              : vErrors.concat(validate107.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs18 = errors
        if (errors === _errs18) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              validate67.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/required",
                  keyword: "required",
                  params: { missingProperty: missing3 },
                  message: "must have required property '" + missing3 + "'",
                },
              ]
              return false
            } else {
              if (data.type !== void 0) {
                let data3 = data.type
                if (!(
                  data3 === "text" ||
                  data3 === "image" ||
                  data3 === "box"
                )) {
                  validate67.errors = [
                    {
                      instancePath: instancePath + "/type",
                      schemaPath: "#/else/else/else/properties/type/enum",
                      keyword: "enum",
                      params: {
                        allowedValues:
                          schema46.else.else.else.properties.type.enum,
                      },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
              }
            }
          } else {
            validate67.errors = [
              {
                instancePath,
                schemaPath: "#/else/else/else/type",
                keyword: "type",
                params: { type: "object" },
                message: "must be object",
              },
            ]
            return false
          }
        }
        var _valid2 = _errs18 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err9 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
        validate67.errors = vErrors
        return false
      }
      var _valid1 = _errs12 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err10 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
      validate67.errors = vErrors
      return false
    }
    var _valid0 = _errs6 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err11 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err11]
    } else {
      vErrors.push(err11)
    }
    errors++
    validate67.errors = vErrors
    return false
  }
  validate67.errors = vErrors
  return errors === 0
}
function validate63(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.v === void 0 && (missing0 = "v")) ||
        (data.title === void 0 && (missing0 = "title")) ||
        (data.blocks === void 0 && (missing0 = "blocks"))
      ) {
        validate63.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "v" ||
            key0 === "title" ||
            key0 === "cover" ||
            key0 === "audio" ||
            key0 === "blocks"
          )) {
            validate63.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.v !== void 0) {
            const _errs3 = errors
            if (1 !== data.v) {
              validate63.errors = [
                {
                  instancePath: instancePath + "/v",
                  schemaPath: "#/properties/v/const",
                  keyword: "const",
                  params: { allowedValue: 1 },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.title !== void 0) {
              let data1 = data.title
              const _errs4 = errors
              if (errors === _errs4) {
                if (typeof data1 === "string") {
                  if (func2(data1) > 200) {
                    validate63.errors = [
                      {
                        instancePath: instancePath + "/title",
                        schemaPath: "#/properties/title/maxLength",
                        keyword: "maxLength",
                        params: { limit: 200 },
                        message: "must NOT have more than 200 characters",
                      },
                    ]
                    return false
                  }
                } else {
                  validate63.errors = [
                    {
                      instancePath: instancePath + "/title",
                      schemaPath: "#/properties/title/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.cover !== void 0) {
                const _errs6 = errors
                if (
                  !validate64(data.cover, {
                    instancePath: instancePath + "/cover",
                    parentData: data,
                    parentDataProperty: "cover",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate64.errors
                      : vErrors.concat(validate64.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs6 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.audio !== void 0) {
                  const _errs7 = errors
                  if (
                    !validate64(data.audio, {
                      instancePath: instancePath + "/audio",
                      parentData: data,
                      parentDataProperty: "audio",
                      rootData,
                    })
                  ) {
                    vErrors =
                      vErrors === null
                        ? validate64.errors
                        : vErrors.concat(validate64.errors)
                    errors = vErrors.length
                  }
                  var valid0 = _errs7 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.blocks !== void 0) {
                    let data4 = data.blocks
                    const _errs8 = errors
                    if (errors === _errs8) {
                      if (Array.isArray(data4)) {
                        var valid1 = true
                        const len0 = data4.length
                        for (let i0 = 0; i0 < len0; i0++) {
                          const _errs10 = errors
                          if (
                            !validate67(data4[i0], {
                              instancePath: instancePath + "/blocks/" + i0,
                              parentData: data4,
                              parentDataProperty: i0,
                              rootData,
                            })
                          ) {
                            vErrors =
                              vErrors === null
                                ? validate67.errors
                                : vErrors.concat(validate67.errors)
                            errors = vErrors.length
                          }
                          var valid1 = _errs10 === errors
                          if (!valid1) {
                            break
                          }
                        }
                      } else {
                        validate63.errors = [
                          {
                            instancePath: instancePath + "/blocks",
                            schemaPath: "#/properties/blocks/type",
                            keyword: "type",
                            params: { type: "array" },
                            message: "must be array",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs8 === errors
                  } else {
                    var valid0 = true
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate63.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate63.errors = vErrors
  return errors === 0
}
var validateBlock = validate114
function validate114(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs1 = errors
  let valid0 = true
  const _errs2 = errors
  if (errors === _errs2) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs2 === errors
  errors = _errs1
  if (vErrors !== null) {
    if (_errs1) {
      vErrors.length = _errs1
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs5 = errors
    if (
      !validate15(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate15.errors : vErrors.concat(validate15.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs6 = errors
    const _errs7 = errors
    let valid2 = true
    const _errs8 = errors
    if (errors === _errs8) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("image" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs8 === errors
    errors = _errs7
    if (vErrors !== null) {
      if (_errs7) {
        vErrors.length = _errs7
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs11 = errors
      if (
        !validate52(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs12 = errors
      const _errs13 = errors
      let valid4 = true
      const _errs14 = errors
      if (errors === _errs14) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("box" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs14 === errors
      errors = _errs13
      if (vErrors !== null) {
        if (_errs13) {
          vErrors.length = _errs13
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs17 = errors
        if (
          !validate54(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate54.errors
              : vErrors.concat(validate54.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs18 = errors
        const _errs19 = errors
        let valid6 = true
        const _errs20 = errors
        if (errors === _errs20) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              const err9 = {}
              if (vErrors === null) {
                vErrors = [err9]
              } else {
                vErrors.push(err9)
              }
              errors++
            } else {
              if (data.type !== void 0) {
                if ("linked" !== data.type) {
                  const err10 = {}
                  if (vErrors === null) {
                    vErrors = [err10]
                  } else {
                    vErrors.push(err10)
                  }
                  errors++
                }
              }
            }
          } else {
            const err11 = {}
            if (vErrors === null) {
              vErrors = [err11]
            } else {
              vErrors.push(err11)
            }
            errors++
          }
        }
        var _valid3 = _errs20 === errors
        errors = _errs19
        if (vErrors !== null) {
          if (_errs19) {
            vErrors.length = _errs19
          } else {
            vErrors = null
          }
        }
        let ifClause3
        if (_valid3) {
          const _errs23 = errors
          if (
            !validate60(data, {
              instancePath,
              parentData,
              parentDataProperty,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate60.errors
                : vErrors.concat(validate60.errors)
            errors = vErrors.length
          }
          var _valid3 = _errs23 === errors
          valid6 = _valid3
          ifClause3 = "then"
        } else {
          const _errs24 = errors
          if (errors === _errs24) {
            if (data && typeof data == "object" && !Array.isArray(data)) {
              let missing4
              if (data.type === void 0 && (missing4 = "type")) {
                validate114.errors = [
                  {
                    instancePath,
                    schemaPath: "#/else/else/else/else/required",
                    keyword: "required",
                    params: { missingProperty: missing4 },
                    message: "must have required property '" + missing4 + "'",
                  },
                ]
                return false
              } else {
                if (data.type !== void 0) {
                  let data4 = data.type
                  if (!(
                    data4 === "text" ||
                    data4 === "image" ||
                    data4 === "box" ||
                    data4 === "linked"
                  )) {
                    validate114.errors = [
                      {
                        instancePath: instancePath + "/type",
                        schemaPath:
                          "#/else/else/else/else/properties/type/enum",
                        keyword: "enum",
                        params: {
                          allowedValues:
                            schema14.else.else.else.else.properties.type.enum,
                        },
                        message: "must be equal to one of the allowed values",
                      },
                    ]
                    return false
                  }
                }
              }
            } else {
              validate114.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/else/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                },
              ]
              return false
            }
          }
          var _valid3 = _errs24 === errors
          valid6 = _valid3
          ifClause3 = "else"
        }
        if (!valid6) {
          const err12 = {
            instancePath,
            schemaPath: "#/else/else/else/if",
            keyword: "if",
            params: { failingKeyword: ifClause3 },
            message: 'must match "' + ifClause3 + '" schema',
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
          validate114.errors = vErrors
          return false
        }
        var _valid2 = _errs18 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err13 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err13]
        } else {
          vErrors.push(err13)
        }
        errors++
        validate114.errors = vErrors
        return false
      }
      var _valid1 = _errs12 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err14 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err14]
      } else {
        vErrors.push(err14)
      }
      errors++
      validate114.errors = vErrors
      return false
    }
    var _valid0 = _errs6 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err15 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err15]
    } else {
      vErrors.push(err15)
    }
    errors++
    validate114.errors = vErrors
    return false
  }
  validate114.errors = vErrors
  return errors === 0
}
var validatePublished = validate119
function validate120(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (
    !(data && typeof data == "object" && !Array.isArray(data)) &&
    data !== null
  ) {
    validate120.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: { type: schema12.type },
        message: "must be object,null",
      },
    ]
    return false
  }
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.mediaId === void 0 && (missing0 = "mediaId")) {
        validate120.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "mediaId")) {
            validate120.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.mediaId !== void 0) {
            let data0 = data.mediaId
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate120.errors = [
                    {
                      instancePath: instancePath + "/mediaId",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate120.errors = [
                  {
                    instancePath: instancePath + "/mediaId",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
          }
        }
      }
    }
  }
  validate120.errors = vErrors
  return errors === 0
}
var schema76 = {
  $comment:
    "Un bloc au premier niveau d'une version publi\xE9e : jamais de bloc li\xE9 (il est r\xE9solu en copie).",
  tsType: "PublishedTextBlock | PublishedTopImageBlock | PublishedBoxBlock",
  if: {
    type: "object",
    required: ["type"],
    properties: { type: { const: "text" } },
  },
  then: { $ref: "#/definitions/publishedTextBlock" },
  else: {
    if: {
      type: "object",
      required: ["type"],
      properties: { type: { const: "image" } },
    },
    then: { $ref: "#/definitions/publishedTopImageBlock" },
    else: {
      if: {
        type: "object",
        required: ["type"],
        properties: { type: { const: "box" } },
      },
      then: { $ref: "#/definitions/publishedBoxBlock" },
      else: {
        type: "object",
        required: ["type"],
        properties: { type: { enum: ["text", "image", "box"] } },
      },
    },
  },
}
function validate133(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.attrs === void 0 && (missing0 = "attrs"))
      ) {
        validate133.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "attrs")) {
            validate133.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("link" !== data.type) {
              validate133.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "link" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.attrs !== void 0) {
              let data1 = data.attrs
              const _errs3 = errors
              if (errors === _errs3) {
                if (
                  data1 &&
                  typeof data1 == "object" &&
                  !Array.isArray(data1)
                ) {
                  let missing1
                  if (data1.href === void 0 && (missing1 = "href")) {
                    validate133.errors = [
                      {
                        instancePath: instancePath + "/attrs",
                        schemaPath: "#/properties/attrs/required",
                        keyword: "required",
                        params: { missingProperty: missing1 },
                        message:
                          "must have required property '" + missing1 + "'",
                      },
                    ]
                    return false
                  } else {
                    const _errs5 = errors
                    for (const key1 in data1) {
                      if (!(key1 === "href")) {
                        validate133.errors = [
                          {
                            instancePath: instancePath + "/attrs",
                            schemaPath:
                              "#/properties/attrs/additionalProperties",
                            keyword: "additionalProperties",
                            params: { additionalProperty: key1 },
                            message: "must NOT have additional properties",
                          },
                        ]
                        return false
                        break
                      }
                    }
                    if (_errs5 === errors) {
                      if (data1.href !== void 0) {
                        let data2 = data1.href
                        const _errs7 = errors
                        if (errors === _errs7) {
                          if (typeof data2 === "string") {
                            if (func2(data2) > 2048) {
                              validate133.errors = [
                                {
                                  instancePath: instancePath + "/attrs/href",
                                  schemaPath: "#/definitions/href/maxLength",
                                  keyword: "maxLength",
                                  params: { limit: 2048 },
                                  message:
                                    "must NOT have more than 2048 characters",
                                },
                              ]
                              return false
                            } else {
                              if (!pattern2.test(data2)) {
                                validate133.errors = [
                                  {
                                    instancePath: instancePath + "/attrs/href",
                                    schemaPath: "#/definitions/href/pattern",
                                    keyword: "pattern",
                                    params: {
                                      pattern: "^(https://|mailto:)[^\\s]+$",
                                    },
                                    message:
                                      'must match pattern "^(https://|mailto:)[^\\s]+$"',
                                  },
                                ]
                                return false
                              }
                            }
                          } else {
                            validate133.errors = [
                              {
                                instancePath: instancePath + "/attrs/href",
                                schemaPath: "#/definitions/href/type",
                                keyword: "type",
                                params: { type: "string" },
                                message: "must be string",
                              },
                            ]
                            return false
                          }
                        }
                      }
                    }
                  }
                } else {
                  validate133.errors = [
                    {
                      instancePath: instancePath + "/attrs",
                      schemaPath: "#/properties/attrs/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate133.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate133.errors = vErrors
  return errors === 0
}
function validate132(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("link" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate133(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null
          ? validate133.errors
          : vErrors.concat(validate133.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    if (errors === _errs6) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          validate132.errors = [
            {
              instancePath,
              schemaPath: "#/definitions/basicMark/required",
              keyword: "required",
              params: { missingProperty: missing1 },
              message: "must have required property '" + missing1 + "'",
            },
          ]
          return false
        } else {
          const _errs8 = errors
          for (const key0 in data) {
            if (!(key0 === "type")) {
              validate132.errors = [
                {
                  instancePath,
                  schemaPath: "#/definitions/basicMark/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key0 },
                  message: "must NOT have additional properties",
                },
              ]
              return false
              break
            }
          }
          if (_errs8 === errors) {
            if (data.type !== void 0) {
              let data1 = data.type
              if (!(data1 === "bold" || data1 === "italic")) {
                validate132.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/definitions/basicMark/properties/type/enum",
                    keyword: "enum",
                    params: { allowedValues: schema27.properties.type.enum },
                    message: "must be equal to one of the allowed values",
                  },
                ]
                return false
              }
            }
          }
        }
      } else {
        validate132.errors = [
          {
            instancePath,
            schemaPath: "#/definitions/basicMark/type",
            keyword: "type",
            params: { type: "object" },
            message: "must be object",
          },
        ]
        return false
      }
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err3 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
    }
    errors++
    validate132.errors = vErrors
    return false
  }
  validate132.errors = vErrors
  return errors === 0
}
function validate131(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (Array.isArray(data)) {
      var valid0 = true
      const len0 = data.length
      for (let i0 = 0; i0 < len0; i0++) {
        const _errs1 = errors
        if (
          !validate132(data[i0], {
            instancePath: instancePath + "/" + i0,
            parentData: data,
            parentDataProperty: i0,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate132.errors
              : vErrors.concat(validate132.errors)
          errors = vErrors.length
        }
        var valid0 = _errs1 === errors
        if (!valid0) {
          break
        }
      }
    } else {
      validate131.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        },
      ]
      return false
    }
  }
  validate131.errors = vErrors
  return errors === 0
}
function validate130(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.text === void 0 && (missing0 = "text"))
      ) {
        validate130.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "text" || key0 === "marks")) {
            validate130.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("text" !== data.type) {
              validate130.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "text" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.text !== void 0) {
              let data1 = data.text
              const _errs3 = errors
              if (errors === _errs3) {
                if (typeof data1 === "string") {
                  if (func2(data1) < 1) {
                    validate130.errors = [
                      {
                        instancePath: instancePath + "/text",
                        schemaPath: "#/properties/text/minLength",
                        keyword: "minLength",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 characters",
                      },
                    ]
                    return false
                  }
                } else {
                  validate130.errors = [
                    {
                      instancePath: instancePath + "/text",
                      schemaPath: "#/properties/text/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.marks !== void 0) {
                const _errs5 = errors
                if (
                  !validate131(data.marks, {
                    instancePath: instancePath + "/marks",
                    parentData: data,
                    parentDataProperty: "marks",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate131.errors
                      : vErrors.concat(validate131.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs5 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate130.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate130.errors = vErrors
  return errors === 0
}
function validate138(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        validate138.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "marks")) {
            validate138.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("hardBreak" !== data.type) {
              validate138.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "hardBreak" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.marks !== void 0) {
              const _errs3 = errors
              if (
                !validate131(data.marks, {
                  instancePath: instancePath + "/marks",
                  parentData: data,
                  parentDataProperty: "marks",
                  rootData,
                })
              ) {
                vErrors =
                  vErrors === null
                    ? validate131.errors
                    : vErrors.concat(validate131.errors)
                errors = vErrors.length
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate138.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate138.errors = vErrors
  return errors === 0
}
function validate129(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate130(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null
          ? validate130.errors
          : vErrors.concat(validate130.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    if (
      !validate138(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null
          ? validate138.errors
          : vErrors.concat(validate138.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err3 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
    }
    errors++
    validate129.errors = vErrors
    return false
  }
  validate129.errors = vErrors
  return errors === 0
}
function validate128(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (Array.isArray(data)) {
      var valid0 = true
      const len0 = data.length
      for (let i0 = 0; i0 < len0; i0++) {
        const _errs1 = errors
        if (
          !validate129(data[i0], {
            instancePath: instancePath + "/" + i0,
            parentData: data,
            parentDataProperty: i0,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate129.errors
              : vErrors.concat(validate129.errors)
          errors = vErrors.length
        }
        var valid0 = _errs1 === errors
        if (!valid0) {
          break
        }
      }
    } else {
      validate128.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        },
      ]
      return false
    }
  }
  validate128.errors = vErrors
  return errors === 0
}
function validate127(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        validate127.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate127.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("paragraph" !== data.type) {
              validate127.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "paragraph" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              const _errs3 = errors
              if (
                !validate128(data.content, {
                  instancePath: instancePath + "/content",
                  parentData: data,
                  parentDataProperty: "content",
                  rootData,
                })
              ) {
                vErrors =
                  vErrors === null
                    ? validate128.errors
                    : vErrors.concat(validate128.errors)
                errors = vErrors.length
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate127.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate127.errors = vErrors
  return errors === 0
}
function validate144(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.attrs === void 0 && (missing0 = "attrs"))
      ) {
        validate144.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "attrs" || key0 === "content")) {
            validate144.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("heading" !== data.type) {
              validate144.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "heading" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.attrs !== void 0) {
              let data1 = data.attrs
              const _errs4 = errors
              if (errors === _errs4) {
                if (
                  data1 &&
                  typeof data1 == "object" &&
                  !Array.isArray(data1)
                ) {
                  let missing1
                  if (data1.level === void 0 && (missing1 = "level")) {
                    validate144.errors = [
                      {
                        instancePath: instancePath + "/attrs",
                        schemaPath: "#/properties/attrs/required",
                        keyword: "required",
                        params: { missingProperty: missing1 },
                        message:
                          "must have required property '" + missing1 + "'",
                      },
                    ]
                    return false
                  } else {
                    const _errs6 = errors
                    for (const key1 in data1) {
                      if (!(key1 === "level")) {
                        validate144.errors = [
                          {
                            instancePath: instancePath + "/attrs",
                            schemaPath:
                              "#/properties/attrs/additionalProperties",
                            keyword: "additionalProperties",
                            params: { additionalProperty: key1 },
                            message: "must NOT have additional properties",
                          },
                        ]
                        return false
                        break
                      }
                    }
                    if (_errs6 === errors) {
                      if (data1.level !== void 0) {
                        let data2 = data1.level
                        if (!(data2 === 2 || data2 === 3)) {
                          validate144.errors = [
                            {
                              instancePath: instancePath + "/attrs/level",
                              schemaPath:
                                "#/properties/attrs/properties/level/enum",
                              keyword: "enum",
                              params: {
                                allowedValues:
                                  schema29.properties.attrs.properties.level
                                    .enum,
                              },
                              message:
                                "must be equal to one of the allowed values",
                            },
                          ]
                          return false
                        }
                      }
                    }
                  }
                } else {
                  validate144.errors = [
                    {
                      instancePath: instancePath + "/attrs",
                      schemaPath: "#/properties/attrs/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.content !== void 0) {
                const _errs8 = errors
                if (
                  !validate128(data.content, {
                    instancePath: instancePath + "/content",
                    parentData: data,
                    parentDataProperty: "content",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate128.errors
                      : vErrors.concat(validate128.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate144.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate144.errors = vErrors
  return errors === 0
}
var wrapper5 = { validate: validate148 }
function validate151(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate151.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "attrs" || key0 === "content")) {
            validate151.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("orderedList" !== data.type) {
              validate151.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "orderedList" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.attrs !== void 0) {
              let data1 = data.attrs
              const _errs4 = errors
              if (errors === _errs4) {
                if (
                  data1 &&
                  typeof data1 == "object" &&
                  !Array.isArray(data1)
                ) {
                  const _errs6 = errors
                  for (const key1 in data1) {
                    if (!(key1 === "start")) {
                      validate151.errors = [
                        {
                          instancePath: instancePath + "/attrs",
                          schemaPath: "#/properties/attrs/additionalProperties",
                          keyword: "additionalProperties",
                          params: { additionalProperty: key1 },
                          message: "must NOT have additional properties",
                        },
                      ]
                      return false
                      break
                    }
                  }
                  if (_errs6 === errors) {
                    if (data1.start !== void 0) {
                      let data2 = data1.start
                      const _errs7 = errors
                      if (!(
                        typeof data2 == "number" &&
                        !(data2 % 1) &&
                        !isNaN(data2) &&
                        isFinite(data2)
                      )) {
                        validate151.errors = [
                          {
                            instancePath: instancePath + "/attrs/start",
                            schemaPath:
                              "#/properties/attrs/properties/start/type",
                            keyword: "type",
                            params: { type: "integer" },
                            message: "must be integer",
                          },
                        ]
                        return false
                      }
                      if (errors === _errs7) {
                        if (typeof data2 == "number" && isFinite(data2)) {
                          if (data2 > 99999 || isNaN(data2)) {
                            validate151.errors = [
                              {
                                instancePath: instancePath + "/attrs/start",
                                schemaPath:
                                  "#/properties/attrs/properties/start/maximum",
                                keyword: "maximum",
                                params: { comparison: "<=", limit: 99999 },
                                message: "must be <= 99999",
                              },
                            ]
                            return false
                          } else {
                            if (data2 < 1 || isNaN(data2)) {
                              validate151.errors = [
                                {
                                  instancePath: instancePath + "/attrs/start",
                                  schemaPath:
                                    "#/properties/attrs/properties/start/minimum",
                                  keyword: "minimum",
                                  params: { comparison: ">=", limit: 1 },
                                  message: "must be >= 1",
                                },
                              ]
                              return false
                            }
                          }
                        }
                      }
                    }
                  }
                } else {
                  validate151.errors = [
                    {
                      instancePath: instancePath + "/attrs",
                      schemaPath: "#/properties/attrs/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.content !== void 0) {
                let data3 = data.content
                const _errs9 = errors
                if (errors === _errs9) {
                  if (Array.isArray(data3)) {
                    if (data3.length < 1) {
                      validate151.errors = [
                        {
                          instancePath: instancePath + "/content",
                          schemaPath: "#/properties/content/minItems",
                          keyword: "minItems",
                          params: { limit: 1 },
                          message: "must NOT have fewer than 1 items",
                        },
                      ]
                      return false
                    } else {
                      var valid2 = true
                      const len0 = data3.length
                      for (let i0 = 0; i0 < len0; i0++) {
                        const _errs11 = errors
                        if (
                          !wrapper5.validate(data3[i0], {
                            instancePath: instancePath + "/content/" + i0,
                            parentData: data3,
                            parentDataProperty: i0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? wrapper5.validate.errors
                              : vErrors.concat(wrapper5.validate.errors)
                          errors = vErrors.length
                        }
                        var valid2 = _errs11 === errors
                        if (!valid2) {
                          break
                        }
                      }
                    }
                  } else {
                    validate151.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/type",
                        keyword: "type",
                        params: { type: "array" },
                        message: "must be array",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs9 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate151.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate151.errors = vErrors
  return errors === 0
}
var wrapper4 = { validate: validate147 }
function validate149(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("paragraph" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate127(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null
          ? validate127.errors
          : vErrors.concat(validate127.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    let valid2 = true
    const _errs7 = errors
    if (errors === _errs7) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("bulletList" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs7 === errors
    errors = _errs6
    if (vErrors !== null) {
      if (_errs6) {
        vErrors.length = _errs6
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs10 = errors
      if (
        !wrapper4.validate(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? wrapper4.validate.errors
            : vErrors.concat(wrapper4.validate.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs10 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs11 = errors
      const _errs12 = errors
      let valid4 = true
      const _errs13 = errors
      if (errors === _errs13) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("orderedList" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs13 === errors
      errors = _errs12
      if (vErrors !== null) {
        if (_errs12) {
          vErrors.length = _errs12
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs16 = errors
        if (
          !validate151(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate151.errors
              : vErrors.concat(validate151.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs16 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs17 = errors
        if (errors === _errs17) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              validate149.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/required",
                  keyword: "required",
                  params: { missingProperty: missing3 },
                  message: "must have required property '" + missing3 + "'",
                },
              ]
              return false
            } else {
              if (data.type !== void 0) {
                let data3 = data.type
                if (!(
                  data3 === "paragraph" ||
                  data3 === "bulletList" ||
                  data3 === "orderedList"
                )) {
                  validate149.errors = [
                    {
                      instancePath: instancePath + "/type",
                      schemaPath: "#/else/else/else/properties/type/enum",
                      keyword: "enum",
                      params: {
                        allowedValues:
                          schema32.else.else.else.properties.type.enum,
                      },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
              }
            }
          } else {
            validate149.errors = [
              {
                instancePath,
                schemaPath: "#/else/else/else/type",
                keyword: "type",
                params: { type: "object" },
                message: "must be object",
              },
            ]
            return false
          }
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err9 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
        validate149.errors = vErrors
        return false
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err10 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
      validate149.errors = vErrors
      return false
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err11 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err11]
    } else {
      vErrors.push(err11)
    }
    errors++
    validate149.errors = vErrors
    return false
  }
  validate149.errors = vErrors
  return errors === 0
}
function validate148(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate148.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate148.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("listItem" !== data.type) {
              validate148.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "listItem" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              let data1 = data.content
              const _errs4 = errors
              if (errors === _errs4) {
                if (Array.isArray(data1)) {
                  if (data1.length < 1) {
                    validate148.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/minItems",
                        keyword: "minItems",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 items",
                      },
                    ]
                    return false
                  } else {
                    const len0 = data1.length
                    var valid1 = len0 <= 1
                    if (!valid1) {
                      for (let i0 = 1; i0 < len0; i0++) {
                        const _errs6 = errors
                        if (
                          !validate149(data1[i0], {
                            instancePath: instancePath + "/content/" + i0,
                            parentData: data1,
                            parentDataProperty: i0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validate149.errors
                              : vErrors.concat(validate149.errors)
                          errors = vErrors.length
                        }
                        var valid1 = _errs6 === errors
                        if (!valid1) {
                          break
                        }
                      }
                    }
                    if (valid1) {
                      const len1 = data1.length
                      if (len1 > 0) {
                        if (
                          !validate127(data1[0], {
                            instancePath: instancePath + "/content/0",
                            parentData: data1,
                            parentDataProperty: 0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validate127.errors
                              : vErrors.concat(validate127.errors)
                          errors = vErrors.length
                        }
                      }
                    }
                  }
                } else {
                  validate148.errors = [
                    {
                      instancePath: instancePath + "/content",
                      schemaPath: "#/properties/content/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate148.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate148.errors = vErrors
  return errors === 0
}
function validate147(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate147.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate147.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.type !== void 0) {
            const _errs2 = errors
            if ("bulletList" !== data.type) {
              validate147.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "bulletList" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              let data1 = data.content
              const _errs3 = errors
              if (errors === _errs3) {
                if (Array.isArray(data1)) {
                  if (data1.length < 1) {
                    validate147.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/minItems",
                        keyword: "minItems",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 items",
                      },
                    ]
                    return false
                  } else {
                    var valid1 = true
                    const len0 = data1.length
                    for (let i0 = 0; i0 < len0; i0++) {
                      const _errs5 = errors
                      if (
                        !validate148(data1[i0], {
                          instancePath: instancePath + "/content/" + i0,
                          parentData: data1,
                          parentDataProperty: i0,
                          rootData,
                        })
                      ) {
                        vErrors =
                          vErrors === null
                            ? validate148.errors
                            : vErrors.concat(validate148.errors)
                        errors = vErrors.length
                      }
                      var valid1 = _errs5 === errors
                      if (!valid1) {
                        break
                      }
                    }
                  }
                } else {
                  validate147.errors = [
                    {
                      instancePath: instancePath + "/content",
                      schemaPath: "#/properties/content/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs3 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate147.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate147.errors = vErrors
  return errors === 0
}
function validate126(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("paragraph" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate127(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null
          ? validate127.errors
          : vErrors.concat(validate127.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    let valid2 = true
    const _errs7 = errors
    if (errors === _errs7) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("heading" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs7 === errors
    errors = _errs6
    if (vErrors !== null) {
      if (_errs6) {
        vErrors.length = _errs6
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs10 = errors
      if (
        !validate144(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate144.errors
            : vErrors.concat(validate144.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs10 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs11 = errors
      const _errs12 = errors
      let valid4 = true
      const _errs13 = errors
      if (errors === _errs13) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("bulletList" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs13 === errors
      errors = _errs12
      if (vErrors !== null) {
        if (_errs12) {
          vErrors.length = _errs12
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs16 = errors
        if (
          !validate147(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate147.errors
              : vErrors.concat(validate147.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs16 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs17 = errors
        const _errs18 = errors
        let valid6 = true
        const _errs19 = errors
        if (errors === _errs19) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              const err9 = {}
              if (vErrors === null) {
                vErrors = [err9]
              } else {
                vErrors.push(err9)
              }
              errors++
            } else {
              if (data.type !== void 0) {
                if ("orderedList" !== data.type) {
                  const err10 = {}
                  if (vErrors === null) {
                    vErrors = [err10]
                  } else {
                    vErrors.push(err10)
                  }
                  errors++
                }
              }
            }
          } else {
            const err11 = {}
            if (vErrors === null) {
              vErrors = [err11]
            } else {
              vErrors.push(err11)
            }
            errors++
          }
        }
        var _valid3 = _errs19 === errors
        errors = _errs18
        if (vErrors !== null) {
          if (_errs18) {
            vErrors.length = _errs18
          } else {
            vErrors = null
          }
        }
        let ifClause3
        if (_valid3) {
          const _errs22 = errors
          if (
            !validate151(data, {
              instancePath,
              parentData,
              parentDataProperty,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate151.errors
                : vErrors.concat(validate151.errors)
            errors = vErrors.length
          }
          var _valid3 = _errs22 === errors
          valid6 = _valid3
          ifClause3 = "then"
        } else {
          const _errs23 = errors
          if (errors === _errs23) {
            if (data && typeof data == "object" && !Array.isArray(data)) {
              let missing4
              if (data.type === void 0 && (missing4 = "type")) {
                validate126.errors = [
                  {
                    instancePath,
                    schemaPath: "#/else/else/else/else/required",
                    keyword: "required",
                    params: { missingProperty: missing4 },
                    message: "must have required property '" + missing4 + "'",
                  },
                ]
                return false
              } else {
                if (data.type !== void 0) {
                  let data4 = data.type
                  if (!(
                    data4 === "paragraph" ||
                    data4 === "heading" ||
                    data4 === "bulletList" ||
                    data4 === "orderedList"
                  )) {
                    validate126.errors = [
                      {
                        instancePath: instancePath + "/type",
                        schemaPath:
                          "#/else/else/else/else/properties/type/enum",
                        keyword: "enum",
                        params: {
                          allowedValues:
                            schema18.else.else.else.else.properties.type.enum,
                        },
                        message: "must be equal to one of the allowed values",
                      },
                    ]
                    return false
                  }
                }
              }
            } else {
              validate126.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/else/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                },
              ]
              return false
            }
          }
          var _valid3 = _errs23 === errors
          valid6 = _valid3
          ifClause3 = "else"
        }
        if (!valid6) {
          const err12 = {
            instancePath,
            schemaPath: "#/else/else/else/if",
            keyword: "if",
            params: { failingKeyword: ifClause3 },
            message: 'must match "' + ifClause3 + '" schema',
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
          validate126.errors = vErrors
          return false
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err13 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err13]
        } else {
          vErrors.push(err13)
        }
        errors++
        validate126.errors = vErrors
        return false
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err14 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err14]
      } else {
        vErrors.push(err14)
      }
      errors++
      validate126.errors = vErrors
      return false
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err15 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err15]
    } else {
      vErrors.push(err15)
    }
    errors++
    validate126.errors = vErrors
    return false
  }
  validate126.errors = vErrors
  return errors === 0
}
function validate125(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.type === void 0 && (missing0 = "type")) ||
        (data.content === void 0 && (missing0 = "content"))
      ) {
        validate125.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "content")) {
            validate125.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.type !== void 0) {
            const _errs3 = errors
            if ("doc" !== data.type) {
              validate125.errors = [
                {
                  instancePath: instancePath + "/type",
                  schemaPath: "#/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "doc" },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.content !== void 0) {
              let data1 = data.content
              const _errs4 = errors
              if (errors === _errs4) {
                if (Array.isArray(data1)) {
                  if (data1.length < 1) {
                    validate125.errors = [
                      {
                        instancePath: instancePath + "/content",
                        schemaPath: "#/properties/content/minItems",
                        keyword: "minItems",
                        params: { limit: 1 },
                        message: "must NOT have fewer than 1 items",
                      },
                    ]
                    return false
                  } else {
                    var valid1 = true
                    const len0 = data1.length
                    for (let i0 = 0; i0 < len0; i0++) {
                      const _errs6 = errors
                      if (
                        !validate126(data1[i0], {
                          instancePath: instancePath + "/content/" + i0,
                          parentData: data1,
                          parentDataProperty: i0,
                          rootData,
                        })
                      ) {
                        vErrors =
                          vErrors === null
                            ? validate126.errors
                            : vErrors.concat(validate126.errors)
                        errors = vErrors.length
                      }
                      var valid1 = _errs6 === errors
                      if (!valid1) {
                        break
                      }
                    }
                  }
                } else {
                  validate125.errors = [
                    {
                      instancePath: instancePath + "/content",
                      schemaPath: "#/properties/content/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
          }
        }
      }
    } else {
      validate125.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate125.errors = vErrors
  return errors === 0
}
function validate124(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.doc === void 0 && (missing0 = "doc"))
      ) {
        validate124.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "type" ||
            key0 === "doc" ||
            key0 === "templateId"
          )) {
            validate124.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate124.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate124.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs7 = errors
              if ("text" !== data.type) {
                validate124.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "text" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.doc !== void 0) {
                const _errs8 = errors
                if (
                  !validate125(data.doc, {
                    instancePath: instancePath + "/doc",
                    parentData: data,
                    parentDataProperty: "doc",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate125.errors
                      : vErrors.concat(validate125.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.templateId !== void 0) {
                  let data3 = data.templateId
                  const _errs9 = errors
                  const _errs10 = errors
                  if (errors === _errs10) {
                    if (typeof data3 === "string") {
                      if (!pattern0.test(data3)) {
                        validate124.errors = [
                          {
                            instancePath: instancePath + "/templateId",
                            schemaPath: "#/definitions/uuid/pattern",
                            keyword: "pattern",
                            params: {
                              pattern:
                                "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                            },
                            message:
                              'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                          },
                        ]
                        return false
                      }
                    } else {
                      validate124.errors = [
                        {
                          instancePath: instancePath + "/templateId",
                          schemaPath: "#/definitions/uuid/type",
                          keyword: "type",
                          params: { type: "string" },
                          message: "must be string",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs9 === errors
                } else {
                  var valid0 = true
                }
              }
            }
          }
        }
      }
    } else {
      validate124.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate124.errors = vErrors
  return errors === 0
}
var schema97 = {
  $comment:
    "Image au premier niveau d'une version publi\xE9e (comme publishedImageBlock), avec le marqueur templateId d'une copie de mod\xE8le.",
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "mediaId", "caption", "alt"],
  properties: {
    id: { $ref: "#/definitions/uuid" },
    type: { const: "image" },
    mediaId: { $ref: "#/definitions/uuid" },
    caption: { type: ["string", "null"], maxLength: 300 },
    alt: { type: "string", maxLength: 1e3 },
    altFromLibrary: { const: true },
    templateId: { $ref: "#/definitions/uuid" },
  },
}
function validate161(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.mediaId === void 0 && (missing0 = "mediaId")) ||
        (data.caption === void 0 && (missing0 = "caption")) ||
        (data.alt === void 0 && (missing0 = "alt"))
      ) {
        validate161.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "type" ||
            key0 === "mediaId" ||
            key0 === "caption" ||
            key0 === "alt" ||
            key0 === "altFromLibrary" ||
            key0 === "templateId"
          )) {
            validate161.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate161.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate161.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs7 = errors
              if ("image" !== data.type) {
                validate161.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "image" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.mediaId !== void 0) {
                let data2 = data.mediaId
                const _errs8 = errors
                const _errs9 = errors
                if (errors === _errs9) {
                  if (typeof data2 === "string") {
                    if (!pattern0.test(data2)) {
                      validate161.errors = [
                        {
                          instancePath: instancePath + "/mediaId",
                          schemaPath: "#/definitions/uuid/pattern",
                          keyword: "pattern",
                          params: {
                            pattern:
                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                          },
                          message:
                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                        },
                      ]
                      return false
                    }
                  } else {
                    validate161.errors = [
                      {
                        instancePath: instancePath + "/mediaId",
                        schemaPath: "#/definitions/uuid/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.caption !== void 0) {
                  let data3 = data.caption
                  const _errs12 = errors
                  if (typeof data3 !== "string" && data3 !== null) {
                    validate161.errors = [
                      {
                        instancePath: instancePath + "/caption",
                        schemaPath: "#/properties/caption/type",
                        keyword: "type",
                        params: { type: schema97.properties.caption.type },
                        message: "must be string,null",
                      },
                    ]
                    return false
                  }
                  if (errors === _errs12) {
                    if (typeof data3 === "string") {
                      if (func2(data3) > 300) {
                        validate161.errors = [
                          {
                            instancePath: instancePath + "/caption",
                            schemaPath: "#/properties/caption/maxLength",
                            keyword: "maxLength",
                            params: { limit: 300 },
                            message: "must NOT have more than 300 characters",
                          },
                        ]
                        return false
                      }
                    }
                  }
                  var valid0 = _errs12 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.alt !== void 0) {
                    let data4 = data.alt
                    const _errs14 = errors
                    if (errors === _errs14) {
                      if (typeof data4 === "string") {
                        if (func2(data4) > 1e3) {
                          validate161.errors = [
                            {
                              instancePath: instancePath + "/alt",
                              schemaPath: "#/properties/alt/maxLength",
                              keyword: "maxLength",
                              params: { limit: 1e3 },
                              message:
                                "must NOT have more than 1000 characters",
                            },
                          ]
                          return false
                        }
                      } else {
                        validate161.errors = [
                          {
                            instancePath: instancePath + "/alt",
                            schemaPath: "#/properties/alt/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs14 === errors
                  } else {
                    var valid0 = true
                  }
                  if (valid0) {
                    if (data.altFromLibrary !== void 0) {
                      const _errs16 = errors
                      if (true !== data.altFromLibrary) {
                        validate161.errors = [
                          {
                            instancePath: instancePath + "/altFromLibrary",
                            schemaPath: "#/properties/altFromLibrary/const",
                            keyword: "const",
                            params: { allowedValue: true },
                            message: "must be equal to constant",
                          },
                        ]
                        return false
                      }
                      var valid0 = _errs16 === errors
                    } else {
                      var valid0 = true
                    }
                    if (valid0) {
                      if (data.templateId !== void 0) {
                        let data6 = data.templateId
                        const _errs17 = errors
                        const _errs18 = errors
                        if (errors === _errs18) {
                          if (typeof data6 === "string") {
                            if (!pattern0.test(data6)) {
                              validate161.errors = [
                                {
                                  instancePath: instancePath + "/templateId",
                                  schemaPath: "#/definitions/uuid/pattern",
                                  keyword: "pattern",
                                  params: {
                                    pattern:
                                      "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                                  },
                                  message:
                                    'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                                },
                              ]
                              return false
                            }
                          } else {
                            validate161.errors = [
                              {
                                instancePath: instancePath + "/templateId",
                                schemaPath: "#/definitions/uuid/type",
                                keyword: "type",
                                params: { type: "string" },
                                message: "must be string",
                              },
                            ]
                            return false
                          }
                        }
                        var valid0 = _errs17 === errors
                      } else {
                        var valid0 = true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate161.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate161.errors = vErrors
  return errors === 0
}
var schema101 = {
  $comment:
    "Encadr\xE9 d'une version publi\xE9e : Texte et Image (fichier obligatoire) seulement, avec le marqueur templateId d'une copie de mod\xE8le.",
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "look", "blocks"],
  properties: {
    id: { $ref: "#/definitions/uuid" },
    type: { const: "box" },
    look: { enum: ["fill", "border"] },
    blocks: {
      type: "array",
      items: { $ref: "#/definitions/publishedBoxChild" },
    },
    templateId: { $ref: "#/definitions/uuid" },
  },
}
var schema103 = {
  tsType: "TextBlock | PublishedImageBlock",
  if: {
    type: "object",
    required: ["type"],
    properties: { type: { const: "text" } },
  },
  then: { $ref: "#/definitions/textBlock" },
  else: {
    if: {
      type: "object",
      required: ["type"],
      properties: { type: { const: "image" } },
    },
    then: { $ref: "#/definitions/publishedImageBlock" },
    else: {
      type: "object",
      required: ["type"],
      properties: { type: { enum: ["text", "image"] } },
    },
  },
}
function validate165(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.doc === void 0 && (missing0 = "doc"))
      ) {
        validate165.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs1 = errors
        for (const key0 in data) {
          if (!(key0 === "id" || key0 === "type" || key0 === "doc")) {
            validate165.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs1 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs2 = errors
            const _errs3 = errors
            if (errors === _errs3) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate165.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate165.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs2 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs6 = errors
              if ("text" !== data.type) {
                validate165.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "text" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs6 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.doc !== void 0) {
                const _errs7 = errors
                if (
                  !validate125(data.doc, {
                    instancePath: instancePath + "/doc",
                    parentData: data,
                    parentDataProperty: "doc",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate125.errors
                      : vErrors.concat(validate125.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs7 === errors
              } else {
                var valid0 = true
              }
            }
          }
        }
      }
    } else {
      validate165.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate165.errors = vErrors
  return errors === 0
}
var schema106 = {
  $comment:
    "Image d'une version publi\xE9e (dans un encadr\xE9) : fichier obligatoire, texte alternatif r\xE9solu (\xA7 2.4). altFromLibrary : ce texte vient de la m\xE9diath\xE8que (alt null dans le brouillon) ; \xAB Revenir \xE0 cette version \xBB remet alt \xE0 null. L'app l'ignore.",
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "mediaId", "caption", "alt"],
  properties: {
    id: { $ref: "#/definitions/uuid" },
    type: { const: "image" },
    mediaId: { $ref: "#/definitions/uuid" },
    caption: { type: ["string", "null"], maxLength: 300 },
    alt: { type: "string", maxLength: 1e3 },
    altFromLibrary: { const: true },
  },
}
function validate168(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.mediaId === void 0 && (missing0 = "mediaId")) ||
        (data.caption === void 0 && (missing0 = "caption")) ||
        (data.alt === void 0 && (missing0 = "alt"))
      ) {
        validate168.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "type" ||
            key0 === "mediaId" ||
            key0 === "caption" ||
            key0 === "alt" ||
            key0 === "altFromLibrary"
          )) {
            validate168.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate168.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate168.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs7 = errors
              if ("image" !== data.type) {
                validate168.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "image" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.mediaId !== void 0) {
                let data2 = data.mediaId
                const _errs8 = errors
                const _errs9 = errors
                if (errors === _errs9) {
                  if (typeof data2 === "string") {
                    if (!pattern0.test(data2)) {
                      validate168.errors = [
                        {
                          instancePath: instancePath + "/mediaId",
                          schemaPath: "#/definitions/uuid/pattern",
                          keyword: "pattern",
                          params: {
                            pattern:
                              "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                          },
                          message:
                            'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                        },
                      ]
                      return false
                    }
                  } else {
                    validate168.errors = [
                      {
                        instancePath: instancePath + "/mediaId",
                        schemaPath: "#/definitions/uuid/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]
                    return false
                  }
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.caption !== void 0) {
                  let data3 = data.caption
                  const _errs12 = errors
                  if (typeof data3 !== "string" && data3 !== null) {
                    validate168.errors = [
                      {
                        instancePath: instancePath + "/caption",
                        schemaPath: "#/properties/caption/type",
                        keyword: "type",
                        params: { type: schema106.properties.caption.type },
                        message: "must be string,null",
                      },
                    ]
                    return false
                  }
                  if (errors === _errs12) {
                    if (typeof data3 === "string") {
                      if (func2(data3) > 300) {
                        validate168.errors = [
                          {
                            instancePath: instancePath + "/caption",
                            schemaPath: "#/properties/caption/maxLength",
                            keyword: "maxLength",
                            params: { limit: 300 },
                            message: "must NOT have more than 300 characters",
                          },
                        ]
                        return false
                      }
                    }
                  }
                  var valid0 = _errs12 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.alt !== void 0) {
                    let data4 = data.alt
                    const _errs14 = errors
                    if (errors === _errs14) {
                      if (typeof data4 === "string") {
                        if (func2(data4) > 1e3) {
                          validate168.errors = [
                            {
                              instancePath: instancePath + "/alt",
                              schemaPath: "#/properties/alt/maxLength",
                              keyword: "maxLength",
                              params: { limit: 1e3 },
                              message:
                                "must NOT have more than 1000 characters",
                            },
                          ]
                          return false
                        }
                      } else {
                        validate168.errors = [
                          {
                            instancePath: instancePath + "/alt",
                            schemaPath: "#/properties/alt/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs14 === errors
                  } else {
                    var valid0 = true
                  }
                  if (valid0) {
                    if (data.altFromLibrary !== void 0) {
                      const _errs16 = errors
                      if (true !== data.altFromLibrary) {
                        validate168.errors = [
                          {
                            instancePath: instancePath + "/altFromLibrary",
                            schemaPath: "#/properties/altFromLibrary/const",
                            keyword: "const",
                            params: { allowedValue: true },
                            message: "must be equal to constant",
                          },
                        ]
                        return false
                      }
                      var valid0 = _errs16 === errors
                    } else {
                      var valid0 = true
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate168.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate168.errors = vErrors
  return errors === 0
}
function validate164(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = true
  const _errs1 = errors
  if (errors === _errs1) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs1 === errors
  errors = _errs0
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs4 = errors
    if (
      !validate165(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null
          ? validate165.errors
          : vErrors.concat(validate165.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs4 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs5 = errors
    const _errs6 = errors
    let valid2 = true
    const _errs7 = errors
    if (errors === _errs7) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("image" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs7 === errors
    errors = _errs6
    if (vErrors !== null) {
      if (_errs6) {
        vErrors.length = _errs6
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs10 = errors
      if (
        !validate168(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate168.errors
            : vErrors.concat(validate168.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs10 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs11 = errors
      if (errors === _errs11) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            validate164.errors = [
              {
                instancePath,
                schemaPath: "#/else/else/required",
                keyword: "required",
                params: { missingProperty: missing2 },
                message: "must have required property '" + missing2 + "'",
              },
            ]
            return false
          } else {
            if (data.type !== void 0) {
              let data2 = data.type
              if (!(data2 === "text" || data2 === "image")) {
                validate164.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/else/else/properties/type/enum",
                    keyword: "enum",
                    params: {
                      allowedValues: schema103.else.else.properties.type.enum,
                    },
                    message: "must be equal to one of the allowed values",
                  },
                ]
                return false
              }
            }
          }
        } else {
          validate164.errors = [
            {
              instancePath,
              schemaPath: "#/else/else/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            },
          ]
          return false
        }
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err6 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err6]
      } else {
        vErrors.push(err6)
      }
      errors++
      validate164.errors = vErrors
      return false
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err7 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err7]
    } else {
      vErrors.push(err7)
    }
    errors++
    validate164.errors = vErrors
    return false
  }
  validate164.errors = vErrors
  return errors === 0
}
function validate163(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.id === void 0 && (missing0 = "id")) ||
        (data.type === void 0 && (missing0 = "type")) ||
        (data.look === void 0 && (missing0 = "look")) ||
        (data.blocks === void 0 && (missing0 = "blocks"))
      ) {
        validate163.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "id" ||
            key0 === "type" ||
            key0 === "look" ||
            key0 === "blocks" ||
            key0 === "templateId"
          )) {
            validate163.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id
            const _errs3 = errors
            const _errs4 = errors
            if (errors === _errs4) {
              if (typeof data0 === "string") {
                if (!pattern0.test(data0)) {
                  validate163.errors = [
                    {
                      instancePath: instancePath + "/id",
                      schemaPath: "#/definitions/uuid/pattern",
                      keyword: "pattern",
                      params: {
                        pattern:
                          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                      },
                      message:
                        'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                    },
                  ]
                  return false
                }
              } else {
                validate163.errors = [
                  {
                    instancePath: instancePath + "/id",
                    schemaPath: "#/definitions/uuid/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]
                return false
              }
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.type !== void 0) {
              const _errs7 = errors
              if ("box" !== data.type) {
                validate163.errors = [
                  {
                    instancePath: instancePath + "/type",
                    schemaPath: "#/properties/type/const",
                    keyword: "const",
                    params: { allowedValue: "box" },
                    message: "must be equal to constant",
                  },
                ]
                return false
              }
              var valid0 = _errs7 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.look !== void 0) {
                let data2 = data.look
                const _errs8 = errors
                if (!(data2 === "fill" || data2 === "border")) {
                  validate163.errors = [
                    {
                      instancePath: instancePath + "/look",
                      schemaPath: "#/properties/look/enum",
                      keyword: "enum",
                      params: { allowedValues: schema101.properties.look.enum },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
                var valid0 = _errs8 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.blocks !== void 0) {
                  let data3 = data.blocks
                  const _errs9 = errors
                  if (errors === _errs9) {
                    if (Array.isArray(data3)) {
                      var valid2 = true
                      const len0 = data3.length
                      for (let i0 = 0; i0 < len0; i0++) {
                        const _errs11 = errors
                        if (
                          !validate164(data3[i0], {
                            instancePath: instancePath + "/blocks/" + i0,
                            parentData: data3,
                            parentDataProperty: i0,
                            rootData,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validate164.errors
                              : vErrors.concat(validate164.errors)
                          errors = vErrors.length
                        }
                        var valid2 = _errs11 === errors
                        if (!valid2) {
                          break
                        }
                      }
                    } else {
                      validate163.errors = [
                        {
                          instancePath: instancePath + "/blocks",
                          schemaPath: "#/properties/blocks/type",
                          keyword: "type",
                          params: { type: "array" },
                          message: "must be array",
                        },
                      ]
                      return false
                    }
                  }
                  var valid0 = _errs9 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.templateId !== void 0) {
                    let data5 = data.templateId
                    const _errs12 = errors
                    const _errs13 = errors
                    if (errors === _errs13) {
                      if (typeof data5 === "string") {
                        if (!pattern0.test(data5)) {
                          validate163.errors = [
                            {
                              instancePath: instancePath + "/templateId",
                              schemaPath: "#/definitions/uuid/pattern",
                              keyword: "pattern",
                              params: {
                                pattern:
                                  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                              },
                              message:
                                'must match pattern "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"',
                            },
                          ]
                          return false
                        }
                      } else {
                        validate163.errors = [
                          {
                            instancePath: instancePath + "/templateId",
                            schemaPath: "#/definitions/uuid/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs12 === errors
                  } else {
                    var valid0 = true
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate163.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate163.errors = vErrors
  return errors === 0
}
function validate123(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs1 = errors
  let valid0 = true
  const _errs2 = errors
  if (errors === _errs2) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs2 === errors
  errors = _errs1
  if (vErrors !== null) {
    if (_errs1) {
      vErrors.length = _errs1
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs5 = errors
    if (
      !validate124(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null
          ? validate124.errors
          : vErrors.concat(validate124.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs6 = errors
    const _errs7 = errors
    let valid2 = true
    const _errs8 = errors
    if (errors === _errs8) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("image" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs8 === errors
    errors = _errs7
    if (vErrors !== null) {
      if (_errs7) {
        vErrors.length = _errs7
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs11 = errors
      if (
        !validate161(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate161.errors
            : vErrors.concat(validate161.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs12 = errors
      const _errs13 = errors
      let valid4 = true
      const _errs14 = errors
      if (errors === _errs14) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("box" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs14 === errors
      errors = _errs13
      if (vErrors !== null) {
        if (_errs13) {
          vErrors.length = _errs13
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs17 = errors
        if (
          !validate163(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate163.errors
              : vErrors.concat(validate163.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs18 = errors
        if (errors === _errs18) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              validate123.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/required",
                  keyword: "required",
                  params: { missingProperty: missing3 },
                  message: "must have required property '" + missing3 + "'",
                },
              ]
              return false
            } else {
              if (data.type !== void 0) {
                let data3 = data.type
                if (!(
                  data3 === "text" ||
                  data3 === "image" ||
                  data3 === "box"
                )) {
                  validate123.errors = [
                    {
                      instancePath: instancePath + "/type",
                      schemaPath: "#/else/else/else/properties/type/enum",
                      keyword: "enum",
                      params: {
                        allowedValues:
                          schema76.else.else.else.properties.type.enum,
                      },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
              }
            }
          } else {
            validate123.errors = [
              {
                instancePath,
                schemaPath: "#/else/else/else/type",
                keyword: "type",
                params: { type: "object" },
                message: "must be object",
              },
            ]
            return false
          }
        }
        var _valid2 = _errs18 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err9 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
        validate123.errors = vErrors
        return false
      }
      var _valid1 = _errs12 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err10 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
      validate123.errors = vErrors
      return false
    }
    var _valid0 = _errs6 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err11 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err11]
    } else {
      vErrors.push(err11)
    }
    errors++
    validate123.errors = vErrors
    return false
  }
  validate123.errors = vErrors
  return errors === 0
}
function validate119(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (
        (data.v === void 0 && (missing0 = "v")) ||
        (data.title === void 0 && (missing0 = "title")) ||
        (data.blocks === void 0 && (missing0 = "blocks"))
      ) {
        validate119.errors = [
          {
            instancePath,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ]
        return false
      } else {
        const _errs2 = errors
        for (const key0 in data) {
          if (!(
            key0 === "v" ||
            key0 === "title" ||
            key0 === "cover" ||
            key0 === "audio" ||
            key0 === "blocks"
          )) {
            validate119.errors = [
              {
                instancePath,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: key0 },
                message: "must NOT have additional properties",
              },
            ]
            return false
            break
          }
        }
        if (_errs2 === errors) {
          if (data.v !== void 0) {
            const _errs3 = errors
            if (1 !== data.v) {
              validate119.errors = [
                {
                  instancePath: instancePath + "/v",
                  schemaPath: "#/properties/v/const",
                  keyword: "const",
                  params: { allowedValue: 1 },
                  message: "must be equal to constant",
                },
              ]
              return false
            }
            var valid0 = _errs3 === errors
          } else {
            var valid0 = true
          }
          if (valid0) {
            if (data.title !== void 0) {
              let data1 = data.title
              const _errs4 = errors
              if (errors === _errs4) {
                if (typeof data1 === "string") {
                  if (func2(data1) > 200) {
                    validate119.errors = [
                      {
                        instancePath: instancePath + "/title",
                        schemaPath: "#/properties/title/maxLength",
                        keyword: "maxLength",
                        params: { limit: 200 },
                        message: "must NOT have more than 200 characters",
                      },
                    ]
                    return false
                  }
                } else {
                  validate119.errors = [
                    {
                      instancePath: instancePath + "/title",
                      schemaPath: "#/properties/title/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]
                  return false
                }
              }
              var valid0 = _errs4 === errors
            } else {
              var valid0 = true
            }
            if (valid0) {
              if (data.cover !== void 0) {
                const _errs6 = errors
                if (
                  !validate120(data.cover, {
                    instancePath: instancePath + "/cover",
                    parentData: data,
                    parentDataProperty: "cover",
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate120.errors
                      : vErrors.concat(validate120.errors)
                  errors = vErrors.length
                }
                var valid0 = _errs6 === errors
              } else {
                var valid0 = true
              }
              if (valid0) {
                if (data.audio !== void 0) {
                  const _errs7 = errors
                  if (
                    !validate120(data.audio, {
                      instancePath: instancePath + "/audio",
                      parentData: data,
                      parentDataProperty: "audio",
                      rootData,
                    })
                  ) {
                    vErrors =
                      vErrors === null
                        ? validate120.errors
                        : vErrors.concat(validate120.errors)
                    errors = vErrors.length
                  }
                  var valid0 = _errs7 === errors
                } else {
                  var valid0 = true
                }
                if (valid0) {
                  if (data.blocks !== void 0) {
                    let data4 = data.blocks
                    const _errs8 = errors
                    if (errors === _errs8) {
                      if (Array.isArray(data4)) {
                        var valid1 = true
                        const len0 = data4.length
                        for (let i0 = 0; i0 < len0; i0++) {
                          const _errs10 = errors
                          if (
                            !validate123(data4[i0], {
                              instancePath: instancePath + "/blocks/" + i0,
                              parentData: data4,
                              parentDataProperty: i0,
                              rootData,
                            })
                          ) {
                            vErrors =
                              vErrors === null
                                ? validate123.errors
                                : vErrors.concat(validate123.errors)
                            errors = vErrors.length
                          }
                          var valid1 = _errs10 === errors
                          if (!valid1) {
                            break
                          }
                        }
                      } else {
                        validate119.errors = [
                          {
                            instancePath: instancePath + "/blocks",
                            schemaPath: "#/properties/blocks/type",
                            keyword: "type",
                            params: { type: "array" },
                            message: "must be array",
                          },
                        ]
                        return false
                      }
                    }
                    var valid0 = _errs8 === errors
                  } else {
                    var valid0 = true
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate119.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        },
      ]
      return false
    }
  }
  validate119.errors = vErrors
  return errors === 0
}
var validatePublishedBlock = validate173
function validate173(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null
  let errors = 0
  const _errs1 = errors
  let valid0 = true
  const _errs2 = errors
  if (errors === _errs2) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0
      if (data.type === void 0 && (missing0 = "type")) {
        const err0 = {}
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      } else {
        if (data.type !== void 0) {
          if ("text" !== data.type) {
            const err1 = {}
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      }
    } else {
      const err2 = {}
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  }
  var _valid0 = _errs2 === errors
  errors = _errs1
  if (vErrors !== null) {
    if (_errs1) {
      vErrors.length = _errs1
    } else {
      vErrors = null
    }
  }
  let ifClause0
  if (_valid0) {
    const _errs5 = errors
    if (
      !validate124(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null
          ? validate124.errors
          : vErrors.concat(validate124.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs5 === errors
    valid0 = _valid0
    ifClause0 = "then"
  } else {
    const _errs6 = errors
    const _errs7 = errors
    let valid2 = true
    const _errs8 = errors
    if (errors === _errs8) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing1
        if (data.type === void 0 && (missing1 = "type")) {
          const err3 = {}
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        } else {
          if (data.type !== void 0) {
            if ("image" !== data.type) {
              const err4 = {}
              if (vErrors === null) {
                vErrors = [err4]
              } else {
                vErrors.push(err4)
              }
              errors++
            }
          }
        }
      } else {
        const err5 = {}
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    var _valid1 = _errs8 === errors
    errors = _errs7
    if (vErrors !== null) {
      if (_errs7) {
        vErrors.length = _errs7
      } else {
        vErrors = null
      }
    }
    let ifClause1
    if (_valid1) {
      const _errs11 = errors
      if (
        !validate161(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate161.errors
            : vErrors.concat(validate161.errors)
        errors = vErrors.length
      }
      var _valid1 = _errs11 === errors
      valid2 = _valid1
      ifClause1 = "then"
    } else {
      const _errs12 = errors
      const _errs13 = errors
      let valid4 = true
      const _errs14 = errors
      if (errors === _errs14) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
          let missing2
          if (data.type === void 0 && (missing2 = "type")) {
            const err6 = {}
            if (vErrors === null) {
              vErrors = [err6]
            } else {
              vErrors.push(err6)
            }
            errors++
          } else {
            if (data.type !== void 0) {
              if ("box" !== data.type) {
                const err7 = {}
                if (vErrors === null) {
                  vErrors = [err7]
                } else {
                  vErrors.push(err7)
                }
                errors++
              }
            }
          }
        } else {
          const err8 = {}
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
      var _valid2 = _errs14 === errors
      errors = _errs13
      if (vErrors !== null) {
        if (_errs13) {
          vErrors.length = _errs13
        } else {
          vErrors = null
        }
      }
      let ifClause2
      if (_valid2) {
        const _errs17 = errors
        if (
          !validate163(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate163.errors
              : vErrors.concat(validate163.errors)
          errors = vErrors.length
        }
        var _valid2 = _errs17 === errors
        valid4 = _valid2
        ifClause2 = "then"
      } else {
        const _errs18 = errors
        if (errors === _errs18) {
          if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing3
            if (data.type === void 0 && (missing3 = "type")) {
              validate173.errors = [
                {
                  instancePath,
                  schemaPath: "#/else/else/else/required",
                  keyword: "required",
                  params: { missingProperty: missing3 },
                  message: "must have required property '" + missing3 + "'",
                },
              ]
              return false
            } else {
              if (data.type !== void 0) {
                let data3 = data.type
                if (!(
                  data3 === "text" ||
                  data3 === "image" ||
                  data3 === "box"
                )) {
                  validate173.errors = [
                    {
                      instancePath: instancePath + "/type",
                      schemaPath: "#/else/else/else/properties/type/enum",
                      keyword: "enum",
                      params: {
                        allowedValues:
                          schema76.else.else.else.properties.type.enum,
                      },
                      message: "must be equal to one of the allowed values",
                    },
                  ]
                  return false
                }
              }
            }
          } else {
            validate173.errors = [
              {
                instancePath,
                schemaPath: "#/else/else/else/type",
                keyword: "type",
                params: { type: "object" },
                message: "must be object",
              },
            ]
            return false
          }
        }
        var _valid2 = _errs18 === errors
        valid4 = _valid2
        ifClause2 = "else"
      }
      if (!valid4) {
        const err9 = {
          instancePath,
          schemaPath: "#/else/else/if",
          keyword: "if",
          params: { failingKeyword: ifClause2 },
          message: 'must match "' + ifClause2 + '" schema',
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
        validate173.errors = vErrors
        return false
      }
      var _valid1 = _errs12 === errors
      valid2 = _valid1
      ifClause1 = "else"
    }
    if (!valid2) {
      const err10 = {
        instancePath,
        schemaPath: "#/else/if",
        keyword: "if",
        params: { failingKeyword: ifClause1 },
        message: 'must match "' + ifClause1 + '" schema',
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
      validate173.errors = vErrors
      return false
    }
    var _valid0 = _errs6 === errors
    valid0 = _valid0
    ifClause0 = "else"
  }
  if (!valid0) {
    const err11 = {
      instancePath,
      schemaPath: "#/if",
      keyword: "if",
      params: { failingKeyword: ifClause0 },
      message: 'must match "' + ifClause0 + '" schema',
    }
    if (vErrors === null) {
      vErrors = [err11]
    } else {
      vErrors.push(err11)
    }
    errors++
    validate173.errors = vErrors
    return false
  }
  validate173.errors = vErrors
  return errors === 0
}
export {
  validateBlock,
  validateDraft,
  validatePublished,
  validatePublishedBlock,
  validateTemplate,
}
