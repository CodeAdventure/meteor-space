describe('Space.Injector annotations', function() {

  describe('Dependency annotation', function() {

    it('adds the dependency to the dependencies map', function() {
      @Space.Dependency('propertyName1', 'dependencyName1')
      @Space.Dependency('propertyName2', 'dependencyName2')
      @Space.Dependency('dependencyName3')
      class FixtureClass {}

      expect(FixtureClass.prototype.dependencies).to.deep.equal({
        'propertyName1': 'dependencyName1',
        'propertyName2': 'dependencyName2',
        'dependencyName3': 'dependencyName3'
      });
    });

    it('does not modify the dependencies map of the parent', function() {
      @Space.Dependency('propertyName0', 'dependencyName0')
      class FixtureParentClass {}

      @Space.Dependency('propertyName1', 'dependencyName1')
      @Space.Dependency('propertyName2', 'dependencyName2')
      class FixtureClass extends FixtureParentClass {}

      expect(FixtureParentClass.prototype.dependencies).to.deep.equal({
        'propertyName0': 'dependencyName0'
      });

      expect(FixtureClass.prototype.dependencies).to.deep.equal({
        'propertyName0': 'dependencyName0',
        'propertyName1': 'dependencyName1',
        'propertyName2': 'dependencyName2'
      });
    });
  });

  describe('RequireModule annotation', function() {

    it('adds the required module to the requiredModules array', function() {
      @Space.RequireModule('fooModule1')
      @Space.RequireModule('fooModule2')
      class FixtureClass {}

      expect(FixtureClass.prototype.requiredModules).to.contain('fooModule1');
      expect(FixtureClass.prototype.requiredModules).to.contain('fooModule2');
    });

    it('does not modify the requiredModules array of the parent', function() {
      @Space.RequireModule('fooModule0')
      class FixtureParentClass {}

      @Space.RequireModule('fooModule1')
      @Space.RequireModule('fooModule2')
      class FixtureClass extends FixtureParentClass {}

      expect(FixtureParentClass.prototype.requiredModules).to.contain('fooModule0');
      expect(FixtureParentClass.prototype.requiredModules).not.to.contain('fooModule1');
      expect(FixtureParentClass.prototype.requiredModules).not.to.contain('fooModule2');

      expect(FixtureClass.prototype.requiredModules).to.contain('fooModule0');
      expect(FixtureClass.prototype.requiredModules).to.contain('fooModule1');
      expect(FixtureClass.prototype.requiredModules).to.contain('fooModule2');
    });

  });

});
