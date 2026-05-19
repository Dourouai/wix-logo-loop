import type { DataCollection } from '@wix/astro/builders';
import { extensions } from '@wix/astro/builders';

const loopLogoCollection: DataCollection = {
  idSuffix: 'database',
  displayName: 'Loop logo',
  displayField: 'title',
  dataPermissions: {
    itemRead: 'ANYONE',
    itemInsert: 'CMS_EDITOR',
    itemUpdate: 'CMS_EDITOR',
    itemRemove: 'CMS_EDITOR',
  },
  fields: [
    {
      key: 'title',
      displayName: 'Title',
      type: 'TEXT',
    },
    {
      key: 'image',
      displayName: 'Image',
      type: 'IMAGE',
    },
    {
      key: 'description',
      displayName: 'Description',
      type: 'TEXT',
    },
    {
      key: 'sortNumber',
      displayName: 'Sort Number',
      type: 'NUMBER',
    },
    {
      key: 'link',
      displayName: 'Link',
      type: 'URL',
    },
  ],
  indexes: [
    {
      fields: [
        {
          path: 'sortNumber',
          order: 'ASC',
        },
      ],
    },
  ],
};

export default extensions.dataCollections({
  id: 'ed5f3d0e-7b79-4717-9c00-c4cd7bbbe906',
  name: 'Zider Logo Loop Data',
  collections: [loopLogoCollection],
});
