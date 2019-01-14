import {CollectionViewer, SelectionChange} from '@angular/cdk/collections';
import {FlatTreeControl} from '@angular/cdk/tree';
import {Component, Injectable} from '@angular/core';
import {BehaviorSubject, Observable, merge, of as observableOf} from 'rxjs';
import {map} from 'rxjs/operators';

class NodeData {
  constructor(
    public id: number,
    public name: string,
    public type: string
  ) {}
}

/** Flat node with expandable and level information */
export class DynamicFlatNode {
  constructor(
    public item: NodeData,
    public level: number = 1,
    public expandable: boolean = false,
    public isLoading: boolean = false,
    public edit: boolean = false) {}
}


/**
 * Database for dynamic data. When expanding a node in the tree, the data source will need to fetch
 * the descendants data from the database.
 */
export class DynamicDatabase {
  dataMap = new Map<NodeData, NodeData[]>([
    [
      {id: 1, name: 'Fruits', type: 'pdf'},
      [
        {id: 2, name: 'Apple', type: 'doc'},
        {id: 3, name: 'Orange', type: 'pdf'},
        {id: 4, name: 'Banana', type: 'pdf'}
      ]
    ],
    [
      {id: 5, name: 'Vegetables', type: 'png'},
      [
        {id: 6, name: 'Tomato', type: 'png'},
        {id: 7, name: 'Potato', type: 'jpg'},
        {id: 8, name: 'Onion', type: 'png'}
      ]
    ],
    [
      {id: 2, name: 'Apple', type: 'doc'},
      [
        {id: 10, name: 'Fuji', type: 'doc'},
        {id: 11, name: 'Macintosh', type: 'doc'}
      ]
    ],
    [
      {id: 8, name: 'Onion', type: 'png'},
      [
        {id: 13, name: 'Fuji', type: 'doc'},
        {id: 14, name: 'White', type: 'png'},
        {id: 15, name: 'Purple', type: 'png'}
      ]
    ]
  ]);


  rootLevelNodes: NodeData[] = [
    {id: 1, name: 'Fruits', type: 'pdf'},
    {id: 5, name: 'Vegetables', type: 'png'}
  ];

  /** Initial data from database */

  initialData(): DynamicFlatNode[] {
    return this.rootLevelNodes.map(item => new DynamicFlatNode(item, 0, true));
  }

  getChildren(node: DynamicFlatNode) {
    const list = Array.from(this.dataMap.keys());
    const ind = list.map(el => el.id).indexOf(node.item.id);
    return this.dataMap.get(list[ind]);
  }

  isExpandable(node: NodeData): boolean {
    const list = Array.from(this.dataMap.keys());
    const ind = list.map(el => el.id).indexOf(node.id);
    return this.dataMap.has(list[ind]);
  }

}


@Injectable()
export class DynamicDataSource {

  dataChange = new BehaviorSubject<DynamicFlatNode[]>([]);

  get data(): DynamicFlatNode[] { return this.dataChange.value; }
  set data(value: DynamicFlatNode[]) {
    this.treeControl.dataNodes = value;
    this.dataChange.next(value);
  }

  constructor(private treeControl: FlatTreeControl<DynamicFlatNode>,
              private database: DynamicDatabase) {}

  connect(collectionViewer: CollectionViewer): Observable<DynamicFlatNode[]> {
    this.treeControl.expansionModel.onChange.subscribe(change => {
      if ((change as SelectionChange<DynamicFlatNode>).added ||
        (change as SelectionChange<DynamicFlatNode>).removed) {
        this.handleTreeControl(change as SelectionChange<DynamicFlatNode>);
      }
    });

    return merge(collectionViewer.viewChange, this.dataChange).pipe(map(() => this.data));
  }

  /** Handle expand/collapse behaviors */
  handleTreeControl(change: SelectionChange<DynamicFlatNode>) {
    if (change.added) {
      change.added.forEach(node => this.toggleNode(node, true));
    }
    if (change.removed) {
      change.removed.slice().reverse().forEach(node => this.toggleNode(node, false));
    }
  }

  /**
   * Toggle the node, remove from display list
   */
  toggleNode(node: DynamicFlatNode, expand: boolean) {
    console.log(node);
    const children = this.database.getChildren(node);
    console.log(children);
    const index = this.data.indexOf(node);
    if (!children || index < 0) { // If no children, or cannot find the node, no op
      return;
    }

    node.isLoading = true;

    setTimeout(() => {
      if (expand) {
        const nodes = children.map(name =>
          new DynamicFlatNode(name, node.level + 1, this.database.isExpandable(name)));
        this.data.splice(index + 1, 0, ...nodes);
      } else {
        let count = 0;
        for (let i = index + 1; i < this.data.length
          && this.data[i].level > node.level; i++, count++) {}
        this.data.splice(index + 1, count);
      }

      // notify the change
      this.dataChange.next(this.data);
      node.isLoading = false;
    }, 1000);
  }
}


@Component({
  selector: 'app-tree',
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.css'],
  providers: [DynamicDatabase]
})
export class TreeComponent {

  constructor(database: DynamicDatabase) {
    this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new DynamicDataSource(this.treeControl, database);

    this.dataSource.data = database.initialData();
  }

  treeControl: FlatTreeControl<DynamicFlatNode>;

  dataSource: DynamicDataSource;

  getLevel = (node: DynamicFlatNode) => node.level;

  isExpandable = (node: DynamicFlatNode) => node.expandable;

  hasChild = (_: number, _nodeData: DynamicFlatNode) => _nodeData.expandable;


  drop(event) {
    console.log(event, this.dataSource);
  }

  dragExit(event) {
    console.log(event);
  }

}

