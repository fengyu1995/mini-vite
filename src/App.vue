<template>
  <div class="container">
   {{title}}
  </div>
</template>

<script>
import { reactive, toRefs } from 'vue';

export default {
  setup () {
    const state = reactive({
      title: 'hello, kvite!'
    })
    return {
      ...toRefs(state)
    }
  }
}
</script>

<style lang="scss" scoped>
$color: green;
body {
  padding: 0;
  margin: 0;
}
.container {
  background-color: $color;
}
</style>