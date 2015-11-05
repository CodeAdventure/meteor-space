
describe 'Space.Struct', ->

  describe 'defining fields', ->

    class TestStruct extends Space.Struct
      fields: -> name: String, age: Match.Integer

    class StructWithNestedStructFields extends Space.Struct
      fields: -> sub: TestStruct

    class ExtendedTestStruct extends TestStruct
      fields: ->
        fields = super()
        fields.extra = Match.Integer
        return fields

    it 'assigns the properties to the instance', ->
      properties = name: 'Dominik', age: 26
      instance = new TestStruct properties
      expect(instance).toMatch properties

    it 'provides a method to cast to plain object', ->
      instance = new TestStruct name: 'Dominik', age: 26
      copy = instance.toPlainObject()
      expect(copy.name).to.equal 'Dominik'
      expect(copy.age).to.equal 26
      expect(copy).to.be.an.object
      expect(copy).not.to.be.instanceof TestStruct

    it 'throws a match error if a property is of wrong type', ->
      expect(-> new TestStruct name: 5, age: 26).to.throw Match.Error

    it 'throws a match error if additional properties are given', ->
      expect(-> new TestStruct name: 5, age: 26, extra: 0).to.throw Match.Error

    it 'throws a match error if a property is missing', ->
      expect(-> new TestStruct name: 5).to.throw Match.Error

    it 'allows to extend the fields of base classes', ->
      expect(-> new ExtendedTestStruct name: 'test', age: 26, extra: 0)
      .not.to.throw Match.Error

    # TODO: remove when breaking change is made for next major version:
    it 'stays backward compatible with static fields api', ->
      class TestStruct extends Space.Struct
        @fields: { name: String, age: Match.Integer }

      properties = name: 'Dominik', age: 26
      instance = new TestStruct properties
      expect(instance).toMatch properties
      expect(-> new TestStruct name: 5).to.throw Match.Error
