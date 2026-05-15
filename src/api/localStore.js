import { pb } from './pocketbaseClient';

export function createEntity(collectionName) {
  return {
    async list(sortField) {
      const sort = sortField || '-created';
      return await pb.collection(collectionName).getFullList({ sort });
    },

    async create(data) {
      return await pb.collection(collectionName).create(data);
    },

    async update(id, data) {
      return await pb.collection(collectionName).update(id, data);
    },

    async delete(id) {
      await pb.collection(collectionName).delete(id);
    },
  };
}
